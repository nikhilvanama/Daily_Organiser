import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Habit, CreateHabitDto, UpdateHabitDto } from '../../core/models/habit.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HabitService {
  private readonly base = `${environment.apiUrl}/habits`;
  private http = inject(HttpClient);

  habits$ = new BehaviorSubject<Habit[]>([]);

  // Build "YYYY-MM-DD" from the user's local clock (not UTC). The server uses this as the
  // reference for "today" so day-of-week scheduling and streaks reflect the user's calendar.
  private localTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private todayParam(): string {
    return `today=${this.localTodayKey()}`;
  }

  loadAll() {
    return this.http.get<Habit[]>(`${this.base}?${this.todayParam()}`).pipe(tap((h) => this.habits$.next(h)));
  }

  create(dto: CreateHabitDto) {
    return this.http.post<Habit>(`${this.base}?${this.todayParam()}`, dto).pipe(
      tap((h) => this.habits$.next([...this.habits$.value, h])),
    );
  }

  update(id: string, dto: UpdateHabitDto) {
    return this.http.patch<Habit>(`${this.base}/${id}?${this.todayParam()}`, dto).pipe(
      tap((u) => this.habits$.next(this.habits$.value.map((h) => (h.id === id ? u : h)))),
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.habits$.next(this.habits$.value.filter((h) => h.id !== id))),
    );
  }

  // Toggle today's completion for a habit. Updates local state optimistically so the
  // checkbox flips instantly; the authoritative server response replaces it ~200-500ms later.
  toggleToday(id: string) {
    const original = this.habits$.value.find((h) => h.id === id);
    if (original) {
      this.replaceHabit(this.optimisticToggleToday(original));
    }
    return this.http.post<Habit>(`${this.base}/${id}/checkin?${this.todayParam()}`, {}).pipe(
      tap((u) => this.replaceHabit(u)),
      catchError((err) => {
        if (original) this.replaceHabit(original);
        return throwError(() => err);
      }),
    );
  }

  // Toggle a specific date (used for heatmap backfill). Same optimistic pattern.
  toggleDate(id: string, date: string) {
    const original = this.habits$.value.find((h) => h.id === id);
    if (original) {
      this.replaceHabit(this.optimisticToggleDate(original, date));
    }
    return this.http.post<Habit>(`${this.base}/${id}/checkin/${date}?${this.todayParam()}`, {}).pipe(
      tap((u) => this.replaceHabit(u)),
      catchError((err) => {
        if (original) this.replaceHabit(original);
        return throwError(() => err);
      }),
    );
  }

  private replaceHabit(updated: Habit) {
    this.habits$.next(this.habits$.value.map((h) => (h.id === updated.id ? updated : h)));
  }

  // Optimistic toggle for today: flip doneToday, adjust streak (+1 or -1), and update history.
  // streak math is exact for today because today is always either +1 to a prior streak or -1 from it.
  private optimisticToggleToday(h: Habit): Habit {
    const todayKey = this.localTodayKey();
    const flipping = !h.doneToday;
    return {
      ...h,
      doneToday: flipping,
      totalCompletions: h.totalCompletions + (flipping ? 1 : -1),
      streak: Math.max(0, h.streak + (flipping ? 1 : -1)),
      history: h.history.map((d) => (d.date === todayKey ? { ...d, done: flipping } : d)),
    };
  }

  // Optimistic toggle for any date: flip the history cell + totalCompletions. Streak isn't
  // touched because past-day changes can ripple in non-obvious ways — the server response fixes it.
  private optimisticToggleDate(h: Habit, date: string): Habit {
    const cell = h.history.find((d) => d.date === date);
    const wasDone = !!cell?.done;
    return {
      ...h,
      totalCompletions: h.totalCompletions + (wasDone ? -1 : 1),
      history: h.history.map((d) => (d.date === date ? { ...d, done: !wasDone } : d)),
      doneToday: date === this.localTodayKey() ? !wasDone : h.doneToday,
    };
  }
}
