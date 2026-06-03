import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { CreateFocusSessionDto, FocusSessionType } from './dto/create-session.dto';

type SessionRecord = {
  id: string;
  userId: string;
  taskId: string | null;
  type: FocusSessionType;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  startedAt: string;
  endedAt: string;
  note: string | null;
  createdAt: string;
};

@Injectable()
export class FocusService {
  constructor(private firebase: FirebaseService) {}

  // List sessions for the user, optionally filtered by date range and/or task.
  async findAll(
    userId: string,
    opts: { from?: string; to?: string; taskId?: string; limit?: number } = {},
  ) {
    const all = await this.firebase.getList<SessionRecord>('focusSessions');
    let sessions = all.filter((s) => s.userId === userId);
    if (opts.taskId) sessions = sessions.filter((s) => s.taskId === opts.taskId);
    if (opts.from) sessions = sessions.filter((s) => s.endedAt >= opts.from!);
    if (opts.to) sessions = sessions.filter((s) => s.endedAt <= opts.to! + 'T23:59:59.999Z');
    sessions.sort((a, b) => b.endedAt.localeCompare(a.endedAt));
    return opts.limit ? sessions.slice(0, opts.limit) : sessions;
  }

  // Record a finished (or abandoned) session.
  async create(userId: string, dto: CreateFocusSessionDto): Promise<SessionRecord> {
    const id = randomUUID();
    const session: SessionRecord = {
      id,
      userId,
      taskId: dto.taskId ?? null,
      type: dto.type,
      plannedMinutes: dto.plannedMinutes,
      actualMinutes: dto.actualMinutes,
      completed: dto.completed,
      startedAt: dto.startedAt,
      endedAt: dto.endedAt,
      note: dto.note ?? null,
      createdAt: new Date().toISOString(),
    };
    await this.firebase.ref(`focusSessions/${id}`).set(session);

    // If this was a WORK session tied to a task, bump that task's tracked minutes.
    if (dto.type === 'WORK' && dto.taskId && dto.actualMinutes > 0) {
      const task = await this.firebase.get<any>(`tasks/${dto.taskId}`);
      if (task && task.userId === userId) {
        const next = Number(task.trackedMins ?? 0) + dto.actualMinutes;
        await this.firebase.update(`tasks/${dto.taskId}`, { trackedMins: next });
      }
    }
    return session;
  }

  async remove(userId: string, id: string) {
    const session = await this.firebase.get<SessionRecord>(`focusSessions/${id}`);
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException();
    await this.firebase.remove(`focusSessions/${id}`);
    return { deleted: true };
  }

  // Today's summary: work session count + minutes + break minutes.
  async getTodaySummary(userId: string, todayLocal: string) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(todayLocal)
      ? todayLocal
      : new Date().toISOString().split('T')[0];
    const all = await this.firebase.getList<SessionRecord>('focusSessions');
    const todays = all.filter(
      (s) => s.userId === userId && s.endedAt.startsWith(date),
    );
    const work = todays.filter((s) => s.type === 'WORK');
    const breaks = todays.filter((s) => s.type !== 'WORK');
    return {
      date,
      workSessions: work.length,
      workMinutes: work.reduce((sum, s) => sum + s.actualMinutes, 0),
      breakMinutes: breaks.reduce((sum, s) => sum + s.actualMinutes, 0),
      sessions: todays.slice(0, 20),
    };
  }
}
