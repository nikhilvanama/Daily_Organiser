import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JournalEntry, UpsertJournalDto } from '../../core/models/journal.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class JournalService {
  private readonly base = `${environment.apiUrl}/journal`;
  private http = inject(HttpClient);

  // Local cache of recent entries, sorted date-desc by the server. Components subscribe.
  entries$ = new BehaviorSubject<JournalEntry[]>([]);

  // YYYY-MM-DD from the user's local clock (not UTC), so "today" matches what the user sees.
  localTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  loadAll() {
    return this.http.get<JournalEntry[]>(this.base).pipe(tap((list) => this.entries$.next(list)));
  }

  // PUT is idempotent: same body twice = same result. Backend upserts by (userId, date).
  upsert(date: string, dto: UpsertJournalDto) {
    return this.http.put<JournalEntry>(`${this.base}/${date}`, dto).pipe(
      tap((saved) => {
        const others = this.entries$.value.filter((e) => e.date !== saved.date);
        this.entries$.next([saved, ...others].sort((a, b) => b.date.localeCompare(a.date)));
      }),
    );
  }

  remove(date: string) {
    return this.http.delete(`${this.base}/${date}`).pipe(
      tap(() => this.entries$.next(this.entries$.value.filter((e) => e.date !== date))),
    );
  }
}
