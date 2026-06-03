import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { FocusService } from '../focus.service';
import { TaskService } from '../../tasks/task.service';
import { Task } from '../../../core/models/task.model';
import { FocusSession, TodayFocusSummary } from '../../../core/models/focus.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-focus-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page animate-in">
      <div class="page-header">
        <div>
          <h2>Focus</h2>
          <p>Pomodoro sessions that log time to the task you're working on</p>
        </div>
      </div>

      <!-- Main timer card -->
      <div class="card timer-card" [attr.data-mode]="focus.mode().toLowerCase()">
        <div class="phase-row">
          <span class="phase-pill" [attr.data-mode]="focus.mode().toLowerCase()">
            {{ phaseLabel() }}
            @if (focus.mode() === 'WORK') {
              · session {{ focus.sessionsInCycle() + 1 }}/{{ focus.settings().sessionsBeforeLongBreak }}
            }
          </span>
          <select class="task-select" [ngModel]="focus.selectedTaskId() ?? ''" (ngModelChange)="onTaskChange($event)" [disabled]="focus.status() === 'running'">
            <option value="">No task</option>
            @for (t of activeTasks(); track t.id) {
              <option [value]="t.id">{{ t.title }}</option>
            }
          </select>
        </div>

        <div class="ring-wrap">
          <svg viewBox="0 0 200 200" class="ring">
            <circle cx="100" cy="100" r="86" class="ring-bg" />
            <circle cx="100" cy="100" r="86" class="ring-fg"
              [attr.stroke]="modeColor()"
              [attr.stroke-dasharray]="ringCirc"
              [attr.stroke-dashoffset]="ringOffset()" />
          </svg>
          <div class="ring-center">
            <span class="time-text">{{ focus.formattedTime() }}</span>
            <span class="mode-label">{{ phaseLabel() }}</span>
          </div>
        </div>

        <div class="controls">
          @if (focus.status() === 'idle') {
            <button class="btn-primary lg" (click)="focus.start()">Start</button>
          } @else if (focus.status() === 'running') {
            <button class="btn-primary lg" (click)="focus.pause()">Pause</button>
            <button class="btn-ghost" (click)="focus.skip()">Skip</button>
            <button class="btn-ghost danger" (click)="focus.stop()">Stop</button>
          } @else {
            <button class="btn-primary lg" (click)="focus.resume()">Resume</button>
            <button class="btn-ghost" (click)="focus.skip()">Skip</button>
            <button class="btn-ghost danger" (click)="focus.stop()">Stop</button>
          }
        </div>
      </div>

      <!-- Today summary -->
      <div class="card today-card">
        <div class="today-header">
          <div>
            <h3>Today</h3>
            <p class="muted">{{ todayDate() }}</p>
          </div>
          <div class="today-stats">
            <div class="stat-block">
              <span class="stat-num">{{ today()?.workSessions ?? 0 }}</span>
              <span class="stat-label">work sessions</span>
            </div>
            <div class="stat-block">
              <span class="stat-num">{{ formatMinutes(today()?.workMinutes ?? 0) }}</span>
              <span class="stat-label">focused</span>
            </div>
            <div class="stat-block">
              <span class="stat-num">{{ formatMinutes(today()?.breakMinutes ?? 0) }}</span>
              <span class="stat-label">breaks</span>
            </div>
          </div>
        </div>

        @if ((today()?.sessions?.length ?? 0) === 0) {
          <div class="empty-state">No sessions yet today. Start one above.</div>
        } @else {
          <ul class="session-list">
            @for (s of today()!.sessions; track s.id) {
              <li class="session-row">
                <span class="session-dot" [class.work]="s.type === 'WORK'" [class.complete]="s.completed"></span>
                <div class="session-main">
                  <span class="session-title">
                    @if (s.type === 'WORK') {
                      {{ taskTitle(s.taskId) ?? 'Focus' }}
                    } @else {
                      {{ s.type === 'LONG_BREAK' ? 'Long break' : 'Short break' }}
                    }
                  </span>
                  <span class="session-meta">
                    {{ formatTimeOfDay(s.endedAt) }} · {{ s.actualMinutes }}m{{ s.completed ? '' : ' (stopped)' }}
                  </span>
                </div>
                <button class="icon-btn" (click)="askDelete(s)" title="Delete session">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </li>
            }
          </ul>
        }
      </div>

      <!-- Settings -->
      <div class="card settings-card">
        <button class="settings-header" (click)="settingsOpen.set(!settingsOpen())">
          <h3>Settings</h3>
          <span class="chev" [class.open]="settingsOpen()">▾</span>
        </button>
        @if (settingsOpen()) {
          <div class="settings-grid">
            <div class="setting">
              <label>Work duration</label>
              <input type="number" min="1" max="180" [ngModel]="focus.settings().workMinutes" (ngModelChange)="setSetting('workMinutes', $event)" /> <span class="unit">min</span>
            </div>
            <div class="setting">
              <label>Short break</label>
              <input type="number" min="1" max="60" [ngModel]="focus.settings().shortBreakMinutes" (ngModelChange)="setSetting('shortBreakMinutes', $event)" /> <span class="unit">min</span>
            </div>
            <div class="setting">
              <label>Long break</label>
              <input type="number" min="1" max="120" [ngModel]="focus.settings().longBreakMinutes" (ngModelChange)="setSetting('longBreakMinutes', $event)" /> <span class="unit">min</span>
            </div>
            <div class="setting">
              <label>Long break every</label>
              <input type="number" min="2" max="12" [ngModel]="focus.settings().sessionsBeforeLongBreak" (ngModelChange)="setSetting('sessionsBeforeLongBreak', $event)" /> <span class="unit">sessions</span>
            </div>
            <div class="setting full">
              <label class="toggle"><input type="checkbox" [ngModel]="focus.settings().autoStartBreaks" (ngModelChange)="setSetting('autoStartBreaks', $event)" /> Auto-start breaks</label>
            </div>
            <div class="setting full">
              <label class="toggle"><input type="checkbox" [ngModel]="focus.settings().autoStartWork" (ngModelChange)="setSetting('autoStartWork', $event)" /> Auto-start next work session</label>
            </div>
            <div class="setting full">
              <label class="toggle"><input type="checkbox" [ngModel]="focus.settings().playSound" (ngModelChange)="setSetting('playSound', $event)" /> Play a beep when a session ends</label>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* Timer card mode-tints */
    .timer-card { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; }
    .phase-row { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 1rem; }
    .phase-pill { font-size: 0.78rem; font-weight: 600; padding: 4px 12px; border-radius: 999px; background: var(--bg-hover); color: var(--text-secondary); }
    .phase-pill[data-mode="work"] { color: var(--accent); background: rgba(16, 185, 129, 0.12); }
    .phase-pill[data-mode="short_break"], .phase-pill[data-mode="long_break"] { color: #3b82f6; background: rgba(59, 130, 246, 0.12); }
    .task-select { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-size: 0.82rem; max-width: 260px; }

    .ring-wrap { position: relative; width: 240px; height: 240px; }
    .ring { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: var(--bg-secondary); stroke-width: 10; }
    .ring-fg { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 0.95s linear, stroke 0.3s; }
    .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
    .time-text { font-size: 3rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-primary); line-height: 1; }
    .mode-label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }

    .controls { display: flex; gap: 0.75rem; align-items: center; }
    .lg { padding: 10px 24px; font-size: 0.95rem; }
    .btn-ghost.danger { color: #ef4444; }
    .btn-ghost.danger:hover { background: rgba(239, 68, 68, 0.1); }

    /* Today summary */
    .today-card { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .today-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .today-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }
    .today-header .muted { font-size: 0.78rem; color: var(--text-muted); }
    .today-stats { display: flex; gap: 1.25rem; }
    .stat-block { display: flex; flex-direction: column; align-items: flex-start; }
    .stat-num { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

    .empty-state { padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; }
    .session-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .session-row { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-radius: 6px; transition: background 0.1s; }
    .session-row:hover { background: var(--bg-hover); }
    .session-dot { width: 10px; height: 10px; border-radius: 50%; background: #94a3b8; flex-shrink: 0; }
    .session-dot.work { background: var(--accent); }
    .session-dot.work.complete { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
    .session-main { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .session-title { font-size: 0.88rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .session-meta { font-size: 0.72rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .icon-btn { background: transparent; border: none; padding: 4px; border-radius: 6px; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    /* Settings */
    .settings-card { padding: 0; overflow: hidden; }
    .settings-header { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 1rem 1.25rem; background: transparent; border: none; cursor: pointer; font-family: inherit; color: inherit; }
    .settings-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }
    .chev { color: var(--text-muted); transition: transform 0.2s; }
    .chev.open { transform: rotate(180deg); }
    .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; padding: 0 1.25rem 1.25rem; border-top: 1px solid var(--border); padding-top: 1rem; }
    .setting { display: flex; align-items: center; gap: 8px; }
    .setting label { font-size: 0.85rem; color: var(--text-secondary); flex: 1; }
    .setting input[type="number"] { width: 64px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-family: inherit; }
    .setting .unit { font-size: 0.78rem; color: var(--text-muted); }
    .setting.full { grid-column: 1 / -1; }
    .setting .toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .setting .toggle input { width: auto; }

    @media (max-width: 700px) {
      .settings-grid { grid-template-columns: 1fr; }
      .today-header { flex-direction: column; align-items: stretch; }
    }
  `],
})
export class FocusPageComponent implements OnInit, OnDestroy {
  focus = inject(FocusService);
  private taskService = inject(TaskService);
  private toast = inject(ToastService);
  private subs: Subscription[] = [];

  tasks = signal<Task[]>([]);
  today = signal<TodayFocusSummary | null>(null);
  settingsOpen = signal<boolean>(false);

  readonly ringCirc = 2 * Math.PI * 86;

  activeTasks = computed(() => this.tasks().filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED'));

  ringOffset = computed(() => this.ringCirc * (1 - this.focus.progressPct() / 100));

  modeColor = computed(() => {
    return this.focus.mode() === 'WORK' ? 'var(--accent)' : '#3b82f6';
  });

  phaseLabel = computed(() => {
    const m = this.focus.mode();
    return m === 'WORK' ? 'Focus' : m === 'SHORT_BREAK' ? 'Short break' : 'Long break';
  });

  todayDate = computed(() => {
    const d = this.today()?.date;
    if (!d) return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  });

  ngOnInit() {
    this.subs.push(this.taskService.tasks$.subscribe((t) => this.tasks.set(t)));
    this.taskService.loadAll().subscribe({ error: () => {} });
    this.subs.push(this.focus.today$.subscribe((t) => this.today.set(t)));
    this.focus.loadToday(this.localTodayKey()).subscribe({ error: () => {} });
  }

  ngOnDestroy() { this.subs.forEach((s) => s.unsubscribe()); }

  onTaskChange(id: string) { this.focus.selectTask(id || null); }

  setSetting(key: string, value: any) {
    // Number inputs come through as strings sometimes — coerce.
    if (typeof value === 'string' && /^-?\d+$/.test(value)) value = Number(value);
    this.focus.updateSettings({ [key]: value } as any);
  }

  taskTitle(id: string | null): string | null {
    if (!id) return null;
    return this.tasks().find((t) => t.id === id)?.title ?? null;
  }

  formatMinutes(min: number): string {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  formatTimeOfDay(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  askDelete(s: FocusSession) {
    if (!confirm(`Delete this ${s.type === 'WORK' ? 'focus' : 'break'} session?`)) return;
    this.focus.deleteSession(s.id).subscribe({
      next: () => this.toast.success('Session deleted'),
    });
  }

  private localTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
