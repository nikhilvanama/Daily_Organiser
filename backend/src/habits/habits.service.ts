import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';

type HabitRecord = {
  id: string;
  title: string;
  description: string | null;
  weekdays: number[];
  startTime: string | null;
  endTime: string | null;
  reminderEnabled: boolean;
  icon: string;
  color: string;
  archived: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type CheckinRecord = {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  completedAt: string;
};

@Injectable()
export class HabitsService {
  constructor(private firebase: FirebaseService) {}

  async findAll(userId: string, today?: string) {
    const [habits, checkins, tasks] = await Promise.all([
      this.firebase.getList<HabitRecord>('habits'),
      this.firebase.getList<CheckinRecord>('habitCheckins'),
      this.firebase.getList<any>('tasks'),
    ]);
    const userHabits = habits
      .filter((h) => h.userId === userId && !h.archived)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const userCheckins = checkins.filter((c) => c.userId === userId);
    const todayKey = this.resolveToday(today);
    // Days covered by any trip plan are treated as rest days for habits (no scheduling,
    // no streak penalty). Auto-detected; no manual marking required.
    const offDates = this.buildTripDates(tasks.filter((t) => t.userId === userId));
    return userHabits.map((h) => this.enrich(h, userCheckins, todayKey, offDates));
  }

  // Returns a Set<YYYY-MM-DD> of every date covered by a trip plan (dueDate..endDate inclusive).
  private buildTripDates(userTasks: any[]): Set<string> {
    const out = new Set<string>();
    for (const t of userTasks) {
      if (t.type !== 'trip' || !t.dueDate) continue;
      const start = t.dueDate.slice(0, 10);
      const end = (t.endDate ?? t.dueDate).slice(0, 10);
      const cursor = new Date(start + 'T00:00:00Z');
      const stop = new Date(end + 'T00:00:00Z');
      while (cursor <= stop) {
        out.add(cursor.toISOString().split('T')[0]);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return out;
  }

  async create(userId: string, dto: CreateHabitDto, today?: string) {
    const id = randomUUID();
    const habit: HabitRecord = {
      id,
      title: dto.title,
      description: dto.description ?? null,
      weekdays: dto.weekdays && dto.weekdays.length > 0 ? Array.from(new Set(dto.weekdays)).sort() : [0, 1, 2, 3, 4, 5, 6],
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      reminderEnabled: dto.reminderEnabled ?? false,
      icon: dto.icon ?? '✓',
      color: dto.color ?? '#10b981',
      archived: false,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.firebase.ref(`habits/${id}`).set(habit);
    return this.enrich(habit, [], this.resolveToday(today));
  }

  async update(userId: string, id: string, dto: UpdateHabitDto, today?: string) {
    await this.ensureOwnership(userId, id);
    const patch: Record<string, any> = { ...dto, updatedAt: new Date().toISOString() };
    if (dto.weekdays) patch.weekdays = Array.from(new Set(dto.weekdays)).sort();
    await this.firebase.update(`habits/${id}`, patch);
    const updated = await this.firebase.get<HabitRecord>(`habits/${id}`);
    const [checkins, tasks] = await Promise.all([
      this.firebase.getList<CheckinRecord>('habitCheckins'),
      this.firebase.getList<any>('tasks'),
    ]);
    const userCheckins = checkins.filter((c) => c.userId === userId);
    const offDates = this.buildTripDates(tasks.filter((t) => t.userId === userId));
    return this.enrich(updated!, userCheckins, this.resolveToday(today), offDates);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    const checkins = await this.firebase.getList<CheckinRecord>('habitCheckins');
    for (const c of checkins) {
      if (c.habitId === id) await this.firebase.remove(`habitCheckins/${c.id}`);
    }
    await this.firebase.remove(`habits/${id}`);
    return { deleted: true };
  }

  // Toggle a check-in for the given habit on the given date (defaults to today).
  // `today` is the client's local "today" used for the response's streak/scheduled fields.
  async toggleCheckin(userId: string, habitId: string, date?: string, today?: string) {
    await this.ensureOwnership(userId, habitId);
    const todayKey = this.resolveToday(today);
    const targetDate = date ?? todayKey;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new NotFoundException('Invalid date format; expected YYYY-MM-DD');
    }
    const checkins = await this.firebase.getList<CheckinRecord>('habitCheckins');
    const existing = checkins.find((c) => c.habitId === habitId && c.date === targetDate && c.userId === userId);
    if (existing) {
      await this.firebase.remove(`habitCheckins/${existing.id}`);
    } else {
      const id = randomUUID();
      const record: CheckinRecord = {
        id,
        habitId,
        userId,
        date: targetDate,
        completedAt: new Date().toISOString(),
      };
      await this.firebase.ref(`habitCheckins/${id}`).set(record);
    }
    const habit = await this.firebase.get<HabitRecord>(`habits/${habitId}`);
    const [freshCheckins, tasks] = await Promise.all([
      this.firebase.getList<CheckinRecord>('habitCheckins'),
      this.firebase.getList<any>('tasks'),
    ]);
    const fresh = freshCheckins.filter((c) => c.userId === userId);
    const offDates = this.buildTripDates(tasks.filter((t) => t.userId === userId));
    return this.enrich(habit!, fresh, todayKey, offDates);
  }

  // --- helpers ---

  private async ensureOwnership(userId: string, id: string) {
    const habit = await this.firebase.get<HabitRecord>(`habits/${id}`);
    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException();
    return habit;
  }

  private todayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Accept a YYYY-MM-DD string from the client (their local "today"); fall back to server UTC.
  private resolveToday(d?: string): string {
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return this.todayKey();
  }

  // Builds the response payload: habit + today's scheduling/completion status + streak + recent history.
  // offDates is a set of YYYY-MM-DD strings the user shouldn't be held accountable for
  // (currently auto-derived from trip plans). Off days are treated as scheduled=false so they
  // never break a streak, never count against consistency, and render as rest cells in the heatmap.
  private enrich(habit: HabitRecord, allUserCheckins: CheckinRecord[], today: string, offDates: Set<string> = new Set()) {
    const habitCheckins = allUserCheckins
      .filter((c) => c.habitId === habit.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    const checkinDates = new Set(habitCheckins.map((c) => c.date));
    // Use UTC throughout: check-ins are stored as UTC date strings (todayKey() is UTC),
    // so the cursor must be UTC too — otherwise a user in a +HH:MM timezone gets
    // a date key one day behind and no streak ever matches.
    const todayCursor = new Date(today + 'T00:00:00Z');
    const isWeekdayMatch = habit.weekdays.includes(todayCursor.getUTCDay());
    const isOffToday = offDates.has(today);
    const scheduledToday = isWeekdayMatch && !isOffToday;
    const doneToday = checkinDates.has(today);

    // Streak: count consecutive scheduled days (walking back from today) that have a check-in.
    // Today not being completed yet does not break a prior streak.
    const habitCreatedDay = habit.createdAt.split('T')[0];
    let streak = 0;
    const cursor = new Date(today + 'T00:00:00Z');
    let firstDay = true;
    while (true) {
      const key = cursor.toISOString().split('T')[0];
      const dayOfWeek = cursor.getUTCDay();
      const scheduled = habit.weekdays.includes(dayOfWeek) && !offDates.has(key);
      if (scheduled) {
        if (checkinDates.has(key)) {
          streak++;
        } else if (firstDay) {
          // Today scheduled but not yet done — don't break the streak, just don't count today.
        } else {
          break;
        }
      }
      // Stop scanning once we go further back than the day the habit was created
      if (key < habitCreatedDay) break;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      firstDay = false;
      // Safety bound — never scan more than a year of history for one streak.
      if (streak > 366) break;
    }

    // Last 30 calendar days, oldest first — convenient for a heatmap or sparkline.
    // Days BEFORE the habit was created are marked scheduled=false so the heatmap doesn't
    // paint them as "missed". Off (trip) days are also marked scheduled=false.
    const history: { date: string; done: boolean; scheduled: boolean; off?: boolean }[] = [];
    const cursor2 = new Date(today + 'T00:00:00Z');
    for (let i = 0; i < 30; i++) {
      const key = cursor2.toISOString().split('T')[0];
      const existed = key >= habitCreatedDay;
      const isOff = offDates.has(key);
      history.unshift({
        date: key,
        done: checkinDates.has(key),
        scheduled: existed && habit.weekdays.includes(cursor2.getUTCDay()) && !isOff,
        off: isOff,
      });
      cursor2.setUTCDate(cursor2.getUTCDate() - 1);
    }

    return {
      ...habit,
      scheduledToday,
      doneToday,
      streak,
      totalCompletions: habitCheckins.length,
      history,
      isOffToday,
    };
  }
}
