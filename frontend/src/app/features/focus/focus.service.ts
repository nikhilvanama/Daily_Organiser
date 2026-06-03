import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  CreateFocusSessionDto,
  DEFAULT_FOCUS_SETTINGS,
  FocusSession,
  FocusSessionType,
  FocusSettings,
  TodayFocusSummary,
} from '../../core/models/focus.model';
import { environment } from '../../../environments/environment';

type FocusMode = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';
type FocusStatus = 'idle' | 'running' | 'paused';

const SETTINGS_KEY = 'do_focus_settings_v1';
const MIN_LOGGABLE_SECONDS = 60; // skip / abandon shorter than 1 min is not logged

@Injectable({ providedIn: 'root' })
export class FocusService {
  private readonly base = `${environment.apiUrl}/focus`;
  private http = inject(HttpClient);

  // --- Timer state (lives in the service so it survives navigation) ---
  settings = signal<FocusSettings>(this.loadSettings());
  mode = signal<FocusMode>('WORK');
  status = signal<FocusStatus>('idle');
  remainingSeconds = signal(this.loadSettings().workMinutes * 60);
  // How many WORK sessions have been completed since the last long break (0..N).
  sessionsInCycle = signal(0);
  // Optional task the current session is tied to.
  selectedTaskId = signal<string | null>(null);

  // --- Today's summary + recent sessions (kept in sync after each record) ---
  today$ = new BehaviorSubject<TodayFocusSummary | null>(null);

  // --- Derived ---
  totalSecondsForMode = computed(() => this.modeMinutes(this.mode()) * 60);
  progressPct = computed(() => {
    const total = this.totalSecondsForMode();
    return total === 0 ? 0 : ((total - this.remainingSeconds()) / total) * 100;
  });
  formattedTime = computed(() => {
    const s = Math.max(0, this.remainingSeconds());
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private sessionStartedAtMs: number | null = null;

  // --- Timer controls ---

  start() {
    if (this.status() === 'running') return;
    if (this.sessionStartedAtMs === null) this.sessionStartedAtMs = Date.now();
    this.status.set('running');
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  pause() {
    if (this.status() !== 'running') return;
    this.status.set('paused');
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  resume() { this.start(); }

  // Stop the current session early. If at least MIN_LOGGABLE_SECONDS elapsed,
  // record it as an abandoned (incomplete) session.
  async stop() {
    if (this.status() === 'idle') return;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    const elapsedSeconds = this.elapsedSeconds();
    if (elapsedSeconds >= MIN_LOGGABLE_SECONDS) {
      await this.recordSession(false);
    }
    this.resetTimerForCurrentMode();
    this.status.set('idle');
    this.sessionStartedAtMs = null;
  }

  // Skip to the next phase without recording (or recording if enough time has passed).
  async skip() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    const elapsedSeconds = this.elapsedSeconds();
    if (elapsedSeconds >= MIN_LOGGABLE_SECONDS) await this.recordSession(false);
    this.advancePhase(false);
  }

  selectTask(id: string | null) { this.selectedTaskId.set(id); }

  updateSettings(patch: Partial<FocusSettings>) {
    const next = { ...this.settings(), ...patch };
    this.settings.set(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    // If the timer is idle, retune the displayed countdown to match new durations.
    if (this.status() === 'idle') this.resetTimerForCurrentMode();
  }

  // --- HTTP ---

  loadToday(localToday?: string) {
    const query = localToday ? `?today=${localToday}` : '';
    return this.http.get<TodayFocusSummary>(`${this.base}/today${query}`).pipe(
      tap((s) => this.today$.next(s)),
    );
  }

  listRecent(limit = 20) {
    return this.http.get<FocusSession[]>(`${this.base}/sessions?limit=${limit}`);
  }

  deleteSession(id: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/sessions/${id}`).pipe(
      tap(() => {
        const t = this.today$.value;
        if (t) this.today$.next({ ...t, sessions: t.sessions.filter((s) => s.id !== id) });
      }),
    );
  }

  // --- Internals ---

  private tick() {
    const r = this.remainingSeconds() - 1;
    if (r <= 0) {
      this.remainingSeconds.set(0);
      void this.handleNaturalCompletion();
      return;
    }
    this.remainingSeconds.set(r);
  }

  private async handleNaturalCompletion() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    await this.recordSession(true);
    this.beep();
    this.advancePhase(true);
  }

  // Build and POST a session record. `completed` is true if the timer ran to zero.
  private async recordSession(completed: boolean) {
    const planned = this.modeMinutes(this.mode());
    const elapsedSec = this.elapsedSeconds();
    const dto: CreateFocusSessionDto = {
      type: this.mode(),
      plannedMinutes: planned,
      actualMinutes: Math.max(1, Math.round(elapsedSec / 60)),
      completed,
      startedAt: this.sessionStartedAtMs ? new Date(this.sessionStartedAtMs).toISOString() : new Date().toISOString(),
      endedAt: new Date().toISOString(),
      taskId: this.selectedTaskId() ?? undefined,
    };
    try {
      await this.http.post<FocusSession>(`${this.base}/sessions`, dto).toPromise();
      // Optimistic: refresh today's summary in the background.
      this.loadToday(this.localTodayKey()).subscribe({ error: () => {} });
    } catch (err) {
      console.error('Focus session record failed', err);
    }
  }

  // Move to the next mode (WORK → break → WORK …).
  private advancePhase(natural: boolean) {
    const settings = this.settings();
    let nextMode: FocusMode;
    let willAutoStart = false;

    if (this.mode() === 'WORK') {
      // Increment cycle count and pick the right break.
      const nextCycleCount = this.sessionsInCycle() + 1;
      this.sessionsInCycle.set(nextCycleCount % settings.sessionsBeforeLongBreak);
      nextMode = nextCycleCount % settings.sessionsBeforeLongBreak === 0 ? 'LONG_BREAK' : 'SHORT_BREAK';
      if (natural && settings.autoStartBreaks) willAutoStart = true;
    } else {
      nextMode = 'WORK';
      if (natural && settings.autoStartWork) willAutoStart = true;
    }

    this.mode.set(nextMode);
    this.remainingSeconds.set(this.modeMinutes(nextMode) * 60);
    this.sessionStartedAtMs = null;

    if (willAutoStart) {
      this.status.set('idle'); // start() expects idle
      this.start();
    } else {
      this.status.set('idle');
    }
  }

  private resetTimerForCurrentMode() {
    this.remainingSeconds.set(this.modeMinutes(this.mode()) * 60);
  }

  private modeMinutes(m: FocusMode): number {
    const s = this.settings();
    return m === 'WORK' ? s.workMinutes : m === 'SHORT_BREAK' ? s.shortBreakMinutes : s.longBreakMinutes;
  }

  private elapsedSeconds(): number {
    return this.totalSecondsForMode() - this.remainingSeconds();
  }

  private loadSettings(): FocusSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_FOCUS_SETTINGS };
      return { ...DEFAULT_FOCUS_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_FOCUS_SETTINGS };
    }
  }

  private localTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Tiny end-of-timer beep using the Web Audio API — no audio file dependency.
  private beep() {
    if (!this.settings().playSound) return;
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      /* ignore audio errors */
    }
  }
}
