import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { UpsertJournalDto } from './dto/upsert-journal.dto';

type JournalEntry = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD — one entry per (user, date)
  title: string | null;
  body: string;
  mood: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class JournalService {
  constructor(private firebase: FirebaseService) {}

  // List all of the user's entries, most recent first. Capped at 100.
  async findAll(userId: string): Promise<JournalEntry[]> {
    const all = await this.firebase.getList<JournalEntry>('journal');
    return all
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 100);
  }

  // Fetch one entry by date; returns null if not yet written.
  async findByDate(userId: string, date: string): Promise<JournalEntry | null> {
    this.assertDateFormat(date);
    const all = await this.firebase.getList<JournalEntry>('journal');
    return all.find((e) => e.userId === userId && e.date === date) ?? null;
  }

  // Create OR update the entry for (userId, date). Body is required; title and mood optional.
  async upsert(userId: string, date: string, dto: UpsertJournalDto): Promise<JournalEntry> {
    this.assertDateFormat(date);
    const all = await this.firebase.getList<JournalEntry>('journal');
    const existing = all.find((e) => e.userId === userId && e.date === date);

    if (existing) {
      const patch = {
        title: dto.title ?? null,
        body: dto.body,
        mood: dto.mood ?? null,
        updatedAt: new Date().toISOString(),
      };
      await this.firebase.update(`journal/${existing.id}`, patch);
      return { ...existing, ...patch };
    }

    const id = randomUUID();
    const entry: JournalEntry = {
      id,
      userId,
      date,
      title: dto.title ?? null,
      body: dto.body,
      mood: dto.mood ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.firebase.ref(`journal/${id}`).set(entry);
    return entry;
  }

  async remove(userId: string, date: string): Promise<{ deleted: true }> {
    this.assertDateFormat(date);
    const all = await this.firebase.getList<JournalEntry>('journal');
    const existing = all.find((e) => e.userId === userId && e.date === date);
    if (!existing) throw new NotFoundException('Journal entry not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.firebase.remove(`journal/${existing.id}`);
    return { deleted: true };
  }

  private assertDateFormat(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new NotFoundException('Invalid date format; expected YYYY-MM-DD');
    }
  }
}
