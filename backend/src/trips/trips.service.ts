import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { CreateTripDto, TripStatus } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

type TripRecord = {
  id: string;
  userId: string;
  title: string;
  destination: string | null;
  description: string | null;
  status: TripStatus;
  startDate: string | null;
  endDate: string | null;
  companions: string | null;
  budget: number | null;
  currency: string;
  notes: string | null;
  references: string[];
  // taskId points to an auto-created task (type='trip') in the Tasks module.
  // Set when the trip moves to BOOKED with dates; the plan flows through to
  // the calendar and triggers habit trip-day exclusion automatically.
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class TripsService {
  constructor(private firebase: FirebaseService) {}

  async findAll(userId: string) {
    const trips = await this.firebase.getList<TripRecord>('trips');
    let userTrips = trips.filter((t) => t.userId === userId).map((t) => this.normalize(t));
    // Auto-promote BOOKED trips whose end date is in the past to VISITED. Mutates in place
    // and writes back so the change is sticky on the next read.
    userTrips = await this.autoVisitPast(userTrips);
    // Backfill: any trip that should have a calendar plan but doesn't get one created now.
    // Heals trips created under the old "only BOOKED" rule (or trips whose linked task was
    // deleted externally).
    for (const t of userTrips) {
      if (this.shouldHavePlan(t) && !t.taskId) {
        await this.syncLinkedTask(t);
      }
    }
    return userTrips.sort((a, b) => {
        // Sort by status group, then by startDate (or createdAt if no startDate).
        const order = (s: TripStatus) =>
          s === 'BOOKED' ? 0
          : s === 'PLANNING' ? 1
          : s === 'BUCKET' ? 2
          : s === 'VISITED' ? 3
          : 4; // CANCELLED
        const g = order(a.status) - order(b.status);
        if (g !== 0) return g;
        const aKey = a.startDate ?? a.createdAt;
        const bKey = b.startDate ?? b.createdAt;
        return aKey.localeCompare(bKey);
      });
  }

  async findOne(userId: string, id: string) {
    const trip = await this.firebase.get<TripRecord>(`trips/${id}`);
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.userId !== userId) throw new ForbiddenException();
    return this.normalize(trip);
  }

  // Firebase Realtime DB drops empty arrays on write (stores them as no-field).
  // When the record comes back, fields that were [] are undefined. The frontend
  // then crashes when it tries to access .length on the missing array, and the
  // whole card silently disappears from the render. Backfill the default here.
  private normalize(trip: TripRecord): TripRecord {
    return { ...trip, references: trip.references ?? [] };
  }

  async create(userId: string, dto: CreateTripDto): Promise<TripRecord> {
    const id = randomUUID();
    const trip: TripRecord = {
      id,
      userId,
      title: dto.title,
      destination: dto.destination ?? null,
      description: dto.description ?? null,
      status: dto.status ?? 'BUCKET',
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      companions: dto.companions ?? null,
      budget: dto.budget ?? null,
      currency: dto.currency ?? 'INR',
      notes: dto.notes ?? null,
      references: dto.references ?? [],
      taskId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.firebase.ref(`trips/${id}`).set(trip);
    // Any non-bucket-list, non-cancelled trip with a start date gets a matching plan
    // so it shows on the calendar and triggers the habit trip-day exclusion.
    if (this.shouldHavePlan(trip)) {
      await this.syncLinkedTask(trip);
    }
    return this.normalize(trip);
  }

  async update(userId: string, id: string, dto: UpdateTripDto): Promise<TripRecord> {
    const existing = await this.findOne(userId, id);
    const patch: Record<string, any> = { updatedAt: new Date().toISOString() };
    // Defined-only spread to avoid Firebase rejecting undefined values.
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) patch[k] = v;
    }
    await this.firebase.update(`trips/${id}`, patch);
    const updated = await this.firebase.get<TripRecord>(`trips/${id}`);
    if (!updated) throw new NotFoundException('Trip vanished mid-update');

    // Reconcile the linked plan with the new state.
    if (this.shouldHavePlan(updated)) {
      await this.syncLinkedTask(updated);
    } else if (existing.taskId) {
      // Trip slid back to bucket-list or got cancelled — delete the orphan plan so
      // the calendar doesn't keep showing it. (User can re-add by moving back into
      // Planning/Booked, which creates a fresh task.)
      const task = await this.firebase.get<any>(`tasks/${existing.taskId}`);
      if (task && task.userId === userId) {
        await this.firebase.remove(`tasks/${existing.taskId}`);
      }
      await this.firebase.update(`trips/${id}`, { taskId: null });
      updated.taskId = null;
    }
    return this.normalize(updated);
  }

  // A trip earns a calendar entry if it has dates AND is past the bucket-list / cancelled
  // states. Planning trips show too so you can see "tentative" travel on the calendar.
  private shouldHavePlan(trip: TripRecord): boolean {
    if (!trip.startDate) return false;
    return trip.status === 'PLANNING' || trip.status === 'BOOKED' || trip.status === 'VISITED';
  }

  // Auto-promote BOOKED trips that have already ended → VISITED. Writes back once so
  // subsequent reads return the new status without re-promoting.
  private async autoVisitPast(trips: TripRecord[]): Promise<TripRecord[]> {
    const todayKey = new Date().toISOString().split('T')[0];
    for (const trip of trips) {
      if (trip.status !== 'BOOKED') continue;
      const endDay = (trip.endDate ?? trip.startDate)?.slice(0, 10);
      if (endDay && endDay < todayKey) {
        await this.firebase.update(`trips/${trip.id}`, {
          status: 'VISITED',
          updatedAt: new Date().toISOString(),
        });
        trip.status = 'VISITED';
      }
    }
    return trips;
  }

  async remove(userId: string, id: string) {
    const trip = await this.findOne(userId, id);
    // Clean up the auto-created plan so the user isn't left with an orphan trip on their calendar.
    if (trip.taskId) {
      const task = await this.firebase.get<any>(`tasks/${trip.taskId}`);
      if (task && task.userId === userId) {
        await this.firebase.remove(`tasks/${trip.taskId}`);
      }
    }
    await this.firebase.remove(`trips/${id}`);
    return { deleted: true };
  }

  // Create or update the task that mirrors this trip on the calendar.
  // Called when the trip is BOOKED with a startDate.
  private async syncLinkedTask(trip: TripRecord): Promise<void> {
    if (!trip.startDate) return;
    const taskPayload = {
      title: trip.title + (trip.destination ? ` (${trip.destination})` : ''),
      type: 'trip',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: trip.startDate,
      endDate: trip.endDate ?? trip.startDate,
      location: trip.destination ?? null,
      description: trip.notes ?? trip.description ?? null,
      userId: trip.userId,
      updatedAt: new Date().toISOString(),
    };

    if (trip.taskId) {
      const existing = await this.firebase.get<any>(`tasks/${trip.taskId}`);
      if (existing && existing.userId === trip.userId) {
        await this.firebase.update(`tasks/${trip.taskId}`, taskPayload);
        return;
      }
      // Stored taskId points to a missing/foreign task — drop it and create fresh.
    }

    const taskId = randomUUID();
    const fullTask = {
      id: taskId,
      ...taskPayload,
      categoryId: null,
      category: null,
      startTime: null,
      endTime: null,
      boardingStation: null,
      destinationStation: null,
      trainNumber: null,
      departureTime: null,
      meetingLink: null,
      completedAt: null,
      estimatedMins: null,
      trackedMins: 0,
      isTimerActive: false,
      timerStartAt: null,
      googleEventId: null,
      createdAt: new Date().toISOString(),
    };
    await this.firebase.ref(`tasks/${taskId}`).set(fullTask);
    await this.firebase.update(`trips/${trip.id}`, { taskId });
    trip.taskId = taskId;
  }
}
