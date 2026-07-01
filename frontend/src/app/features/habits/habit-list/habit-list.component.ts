import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { HabitService } from '../habit.service';
import { Habit, WEEKDAY_LABELS, WEEKDAY_VALUES } from '../../../core/models/habit.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { HabitFormComponent } from '../habit-form/habit-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [ModalComponent, HabitFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page animate-in">
      <div class="page-header">
        <div>
          <h2>Daily Routine</h2>
          <p>Check off your habits, build streaks</p>
        </div>
        <button class="btn-primary" (click)="openAdd()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Habit
        </button>
      </div>

      <div class="card today-card">
        <!-- Card header: title + done count on the left, date navigation on the right -->
        <div class="card-header-row">
          <div class="card-title-block">
            <h3>{{ selectedDate === todayKey() ? "Today's Checklist" : 'Backfill checklist' }}</h3>
            <span class="card-sub">{{ doneCountSelected() }}/{{ scheduledForSelected().length }} done</span>
          </div>
          <div class="date-nav">
            <!-- Calendar picker trigger -->
            <div class="date-picker-wrap">
              <button class="date-trigger" (click)="toggleCal($event)">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div class="date-display">
                  <span class="date-main">{{ selectedLabel }}</span>
                  <span class="date-sub">
                    @if (selectedDate === todayKey()) { Today }
                    @else if (daysAgo() === 1) { Yesterday }
                    @else { {{ daysAgo() }} days ago }
                  </span>
                </div>
              </button>

              @if (showCal) {
                <div class="cal-backdrop" (click)="showCal = false"></div>
                <div class="cal-popup" (click)="$event.stopPropagation()">
                  <div class="cal-head">
                    <button class="cal-nav" (click)="shiftCal(-1)" [disabled]="!canShiftCalBack()" title="Previous month">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <span class="cal-month-label">{{ calMonthLabel }}</span>
                    <button class="cal-nav" (click)="shiftCal(1)" [disabled]="!canShiftCalForward()" title="Next month">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                  <div class="cal-grid">
                    @for (dh of calDayHeaders; track dh) {
                      <span class="cal-dh">{{ dh }}</span>
                    }
                    @for (cell of calCells(); track cell.key) {
                      @if (cell.date) {
                        <button class="cal-cell"
                          [class.selected]="cell.isSelected"
                          [class.is-today]="cell.isToday"
                          [class.out-range]="!cell.inRange"
                          [disabled]="!cell.inRange"
                          (click)="selectCalDate(cell.date)">
                          <span class="cal-num">{{ cell.day }}</span>
                          @if (cell.dotStatus !== 'none') {
                            <span class="cal-dot" [class]="'dot-' + cell.dotStatus"></span>
                          }
                        </button>
                      } @else {
                        <span class="cal-empty"></span>
                      }
                    }
                  </div>
                  <div class="cal-legend">
                    <span class="leg"><span class="cal-dot dot-green"></span>Done</span>
                    <span class="leg"><span class="cal-dot dot-partial"></span>Partial</span>
                    <span class="leg"><span class="cal-dot dot-red"></span>Missed</span>
                    <span class="leg"><span class="cal-dot dot-trip"></span>Trip</span>
                  </div>
                </div>
              }
            </div>

            <button class="nav-btn" (click)="shiftDate(-1)" [disabled]="!canShiftBack()" title="Previous day">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="nav-btn" (click)="shiftDate(1)" [disabled]="!canShiftForward()" title="Next day">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            @if (selectedDate !== todayKey()) {
              <button class="btn-ghost sm jump-today" (click)="goToToday()">Today</button>
            }
          </div>
        </div>
        @if (isSelectedDateOff()) {
          <div class="trip-banner">
            <span class="trip-icon">🧳</span>
            <div class="trip-text">
              <strong>{{ selectedDate === todayKey() ? "You're on a trip today" : 'This was a trip day' }}</strong>
              <small>Daily routine is paused — these dates don't count toward streaks or consistency.</small>
            </div>
          </div>
        }
        @if (scheduledForSelected().length === 0 && !isSelectedDateOff()) {
          <div class="empty">
            <p>No habits scheduled on this day.</p>
          </div>
        } @else if (scheduledForSelected().length > 0) {
          <div class="checklist">
            @for (h of scheduledForSelected(); track h.id) {
              <button class="check-row" [class.done]="isDoneOnSelected(h)" (click)="toggleSelected(h)">
                <span class="check-circle" [style.--ring]="h.color" [style.background]="isDoneOnSelected(h) ? h.color : 'transparent'">
                  @if (isDoneOnSelected(h)) {
                    <svg width="14" height="14" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  }
                </span>
                <span class="check-icon" [style.background]="h.color + '22'" [style.color]="h.color">{{ h.icon }}</span>
                <div class="check-main">
                  <span class="check-title">{{ h.title }}</span>
                  <span class="check-meta">
                    @if (timeLabel(h)) { <span>🕐 {{ timeLabel(h) }}</span> }
                    @if (h.reminderEnabled) { <span class="reminder-pill">🔔 Reminder</span> }
                  </span>
                </div>
                <span class="streak-badge" title="Current streak">🔥 {{ h.streak }}</span>
              </button>
            }
          </div>
        }
      </div>

      @if (allHabits.length > 0) {
        <div class="card">
          <div class="all-habits-header">
            <h3>All habits · 30-day history</h3>
            <div class="filter-chips">
              <button class="filter-chip" [class.active]="habitFilter === 'all'" (click)="habitFilter = 'all'">All</button>
              <button class="filter-chip" [class.active]="habitFilter === 'everyday'" (click)="habitFilter = 'everyday'">Every day</button>
              <button class="filter-chip" [class.active]="habitFilter === 'weekdays'" (click)="habitFilter = 'weekdays'">Weekdays</button>
              <button class="filter-chip" [class.active]="habitFilter === 'weekends'" (click)="habitFilter = 'weekends'">Weekends</button>
              <span class="chip-sep"></span>
              @for (d of dayFilterOptions; track d.value) {
                <button class="filter-chip" [class.active]="habitFilter === d.value" (click)="habitFilter = d.value">{{ d.label }}</button>
              }
            </div>
          </div>
          <div class="habit-grid">
            @if (filteredAllHabits.length === 0) {
              <p class="filter-empty">No habits match this filter.</p>
            }
            @for (h of filteredAllHabits; track h.id) {
              <div class="habit-card">
                <div class="hc-top">
                  <span class="check-icon" [style.background]="h.color + '22'" [style.color]="h.color">{{ h.icon }}</span>
                  <div class="hc-title-wrap">
                    <span class="check-title">{{ h.title }}</span>
                    <span class="check-meta">{{ scheduleLabel(h) }}</span>
                  </div>
                  <div class="hc-actions">
                    <button class="icon-btn" (click)="openEdit(h)" title="Edit">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="icon-btn danger" (click)="askDelete(h)" title="Delete">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
                <div class="hc-stats">
                  <span>🔥 {{ h.streak }} day streak</span>
                  <span>·</span>
                  <span>{{ h.totalCompletions }} total</span>
                </div>
                <div class="heatmap">
                  @for (d of h.history; track d.date) {
                    <button class="heat-cell"
                      [class.done]="d.done"
                      [class.dim]="!d.scheduled && !d.off"
                      [class.off]="d.off"
                      [style.--cell-color]="h.color"
                      [title]="d.date + (d.done ? ' · done' : d.off ? ' · trip day' : d.scheduled ? ' · missed' : ' · not scheduled')"
                      (click)="toggleDate(h, d.date)"></button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (notScheduledForSelected().length > 0) {
        <div class="card">
          <div class="other-header"><h3>Not scheduled {{ selectedDate === todayKey() ? 'today' : 'on this day' }}</h3></div>
          <div class="other-list">
            @for (h of notScheduledForSelected(); track h.id) {
              <div class="other-row">
                <span class="check-icon sm" [style.background]="h.color + '22'" [style.color]="h.color">{{ h.icon }}</span>
                <div class="check-main">
                  <span class="check-title">{{ h.title }}</span>
                  <span class="check-meta">{{ scheduleLabel(h) }}</span>
                </div>
                <span class="streak-badge sm">🔥 {{ h.streak }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <app-modal [isOpen]="showForm" [title]="editing ? 'Edit Habit' : 'New Habit'" (close)="closeForm()" maxWidth="520px">
      @if (showForm) {
        <app-habit-form [habit]="editing" (saved)="onSaved()" (cancelled)="closeForm()" />
      }
    </app-modal>

    <app-confirm-dialog
      [isOpen]="showDelete"
      title="Delete habit"
      [message]="'Are you sure you want to delete &quot;' + (deletingTitle) + '&quot;? Streak history will be lost.'"
      confirmText="Delete"
      (confirmed)="confirmDelete()"
      (cancelled)="showDelete = false" />
  `,
  styles: [`
    .today-card { padding: 1rem 1.25rem; }

    /* Card header: title block on the left, date controls on the right */
    .card-header-row {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding-bottom: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border);
    }
    .card-title-block { display: flex; flex-direction: column; gap: 2px; }
    .card-title-block h3 { font-size: 1rem; font-weight: 600; margin: 0; }
    .card-sub { font-size: 0.72rem; color: var(--text-muted); font-weight: 500; }

    /* Date navigation: arrows + label + jump-to-today, right-aligned */
    .date-nav { display: flex; align-items: center; gap: 8px; }
    .nav-btn {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary); cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: all 0.15s; padding: 0;
    }
    .nav-btn:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); border-color: var(--text-muted); }
    .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .date-picker-wrap { position: relative; }
    .date-trigger {
      display: flex; align-items: center; gap: 8px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 9px; padding: 5px 12px; cursor: pointer;
      color: inherit; font-family: inherit; transition: all 0.15s;
    }
    .date-trigger:hover { background: var(--bg-hover); border-color: var(--text-muted); }
    .date-trigger > svg:first-child { color: var(--text-muted); flex-shrink: 0; }
    .cal-chevron { color: var(--text-muted); flex-shrink: 0; }
    .date-display { display: flex; flex-direction: column; gap: 1px; align-items: flex-start; }
    .date-main { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
    .date-sub { font-size: 0.7rem; color: var(--text-muted); }

    /* Calendar popup */
    .cal-backdrop { position: fixed; inset: 0; z-index: 99; }
    .cal-popup {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 100;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; padding: 14px; width: 252px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    }
    .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .cal-month-label { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
    .cal-nav {
      width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.15s; padding: 0;
    }
    .cal-nav:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
    .cal-nav:disabled { opacity: 0.25; cursor: not-allowed; }

    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .cal-dh { text-align: center; font-size: 0.6rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 4px 0 6px; }
    .cal-empty { aspect-ratio: 1; }
    .cal-cell {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      aspect-ratio: 1; border-radius: 6px; border: 1px solid transparent;
      background: transparent; cursor: pointer; padding: 2px;
      transition: background 0.12s; font-family: inherit;
    }
    .cal-cell:hover:not(:disabled):not(.selected) { background: var(--bg-hover); }
    .cal-cell.selected { background: var(--accent); border-color: transparent; }
    .cal-cell.is-today:not(.selected) { border-color: var(--accent); }
    .cal-cell.out-range { opacity: 0.2; cursor: not-allowed; }
    .cal-num { font-size: 0.75rem; font-weight: 500; color: var(--text-primary); line-height: 1; }
    .cal-cell.selected .cal-num { color: #fff; font-weight: 700; }

    .cal-dot { width: 5px; height: 5px; border-radius: 50%; display: block; flex-shrink: 0; }
    .dot-green   { background: #34d399; }
    .dot-partial { background: #fbbf24; }
    .dot-red     { background: #f87171; }
    .dot-trip    { background: #60a5fa; }

    .cal-legend {
      display: flex; gap: 10px; margin-top: 10px; padding-top: 10px;
      border-top: 1px solid var(--border); flex-wrap: wrap;
    }
    .leg { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--text-muted); }

    .jump-today { padding: 5px 10px; font-size: 0.75rem; }

    @media (max-width: 640px) {
      .card-header-row { flex-direction: column; align-items: stretch; gap: 0.75rem; }
      .date-nav { justify-content: space-between; }
    }
    .other-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
    .other-header h3 { font-size: 0.92rem; font-weight: 600; }

    .all-habits-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.6rem; }
    .all-habits-header h3 { font-size: 0.92rem; font-weight: 600; }
    .filter-chips { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .filter-chip {
      font-size: 0.7rem; font-weight: 500; padding: 3px 10px; border-radius: 99px;
      border: 1px solid var(--border); background: transparent; color: var(--text-muted);
      cursor: pointer; transition: all 0.15s; font-family: inherit;
    }
    .filter-chip:hover { border-color: var(--text-muted); color: var(--text-primary); }
    .filter-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .chip-sep { width: 1px; height: 14px; background: var(--border); margin: 0 3px; flex-shrink: 0; }
    .filter-empty { padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; grid-column: 1 / -1; }
    .other-list { padding: 0.5rem 0.75rem; }
    .other-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 8px; }
    .other-row:hover { background: var(--bg-hover); }

    .checklist { display: flex; flex-direction: column; gap: 4px; }
    .check-row {
      display: flex; align-items: center; gap: 12px; padding: 10px 8px;
      background: transparent; border: none; border-radius: 8px; width: 100%; text-align: left;
      cursor: pointer; transition: background 0.1s; font-family: inherit; color: inherit;
    }
    .check-row:hover { background: var(--bg-hover); }
    .check-row.done .check-title { text-decoration: line-through; color: var(--text-muted); }
    .check-row.done { opacity: 0.7; }

    .check-circle {
      width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--ring, var(--accent));
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: background 0.15s;
    }
    .check-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0; }
    .check-icon.sm { width: 26px; height: 26px; font-size: 0.85rem; }

    .check-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .check-title { font-size: 0.92rem; font-weight: 500; color: var(--text-primary); }
    .check-meta { display: flex; gap: 8px; font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; }
    .reminder-pill { color: var(--text-secondary); }

    .streak-badge {
      font-size: 0.78rem; font-weight: 600; color: var(--text-primary);
      background: var(--bg-hover); padding: 3px 8px; border-radius: 10px;
    }
    .streak-badge.sm { font-size: 0.7rem; }

    .habit-grid { padding: 0.75rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
    .habit-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.85rem; display: flex; flex-direction: column; gap: 8px; }
    .hc-top { display: flex; align-items: center; gap: 10px; }
    .hc-title-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .hc-actions { display: flex; gap: 2px; }
    .icon-btn { background: transparent; border: none; padding: 5px; border-radius: 6px; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .icon-btn.danger:hover { color: #ef4444; }
    .hc-stats { font-size: 0.72rem; color: var(--text-muted); display: flex; gap: 6px; }

    .heatmap { display: grid; grid-template-columns: repeat(30, 1fr); gap: 2px; margin-top: 4px; }
    .heat-cell {
      aspect-ratio: 1; border-radius: 2px; border: none;
      background: var(--bg-hover); cursor: pointer; padding: 0;
      transition: transform 0.1s;
    }
    .heat-cell:hover { transform: scale(1.4); }
    .heat-cell.dim { opacity: 0.35; }
    .heat-cell.done { background: var(--cell-color, var(--accent)); }
    .heat-cell.off { background: rgba(59, 130, 246, 0.18); opacity: 0.8; }
    .heat-cell.off.done { background: var(--cell-color, var(--accent)); } /* if user did the habit on a trip day anyway */

    .empty { padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; }

    /* Trip-day banner — shown when the selected date overlaps a trip plan */
    .trip-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; margin-bottom: 0.75rem;
      background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 8px;
    }
    .trip-icon { font-size: 1.5rem; line-height: 1; }
    .trip-text { display: flex; flex-direction: column; gap: 2px; }
    .trip-text strong { font-size: 0.9rem; color: var(--text-primary); }
    .trip-text small { font-size: 0.78rem; color: var(--text-muted); }

    @media (max-width: 768px) {
      .habit-grid { grid-template-columns: 1fr; }
      .heatmap { grid-template-columns: repeat(15, 1fr); }
    }
  `],
})
export class HabitListComponent implements OnInit, OnDestroy {
  private habitService = inject(HabitService);
  private toast = inject(ToastService);
  private sub: Subscription | null = null;

  allHabits: Habit[] = [];

  habitFilter = 'all';

  readonly dayFilterOptions = [
    { label: 'Mon', value: '1' },
    { label: 'Tue', value: '2' },
    { label: 'Wed', value: '3' },
    { label: 'Thu', value: '4' },
    { label: 'Fri', value: '5' },
    { label: 'Sat', value: '6' },
    { label: 'Sun', value: '0' },
  ];

  get filteredAllHabits(): Habit[] {
    switch (this.habitFilter) {
      case 'everyday': return this.allHabits.filter(h => h.weekdays.length === 7);
      case 'weekdays': return this.allHabits.filter(h => h.weekdays.length === 5 && [1,2,3,4,5].every(d => h.weekdays.includes(d)));
      case 'weekends': return this.allHabits.filter(h => h.weekdays.length === 2 && h.weekdays.includes(0) && h.weekdays.includes(6));
      default: {
        const day = parseInt(this.habitFilter, 10);
        if (!isNaN(day)) return this.allHabits.filter(h => h.weekdays.includes(day));
        return this.allHabits;
      }
    }
  }

  // The date the user is currently viewing/checking. Defaults to local today; can shift back
  // up to 29 days (the heatmap window). Cannot go forward past today.
  selectedDate = this.localTodayKey();

  showForm = false;
  editing: Habit | null = null;
  showDelete = false;
  deletingId = '';
  deletingTitle = '';

  // Calendar picker state
  showCal = false;
  calYear = new Date().getFullYear();
  calMonth = new Date().getMonth();
  readonly calDayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  todayKey(): string { return this.localTodayKey(); }

  // YYYY-MM-DD built from the user's local clock (not UTC).
  private localTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Day-of-week for a YYYY-MM-DD using local time (matches habit.weekdays values).
  private dowFor(dateKey: string): number {
    return new Date(dateKey + 'T00:00:00').getDay();
  }

  // Whole-number days between selectedDate and today.
  daysAgo(): number {
    const today = new Date(this.localTodayKey() + 'T00:00:00').getTime();
    const sel = new Date(this.selectedDate + 'T00:00:00').getTime();
    return Math.round((today - sel) / 86400000);
  }

  // Long-form label like "Saturday, May 23"
  get selectedLabel(): string {
    const d = new Date(this.selectedDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  canShiftBack(): boolean { return this.daysAgo() < 29; }
  canShiftForward(): boolean { return this.selectedDate !== this.localTodayKey(); }

  shiftDate(delta: number) {
    const d = new Date(this.selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // Clamp: can't go forward past today; can't go back past 29 days
    const todayK = this.localTodayKey();
    if (next > todayK) return;
    this.selectedDate = next;
    if (this.daysAgo() > 29) this.selectedDate = todayK; // safety clamp
  }

  goToToday() { this.selectedDate = this.localTodayKey(); }

  // --- Calendar picker ---

  get calMonthLabel(): string {
    return new Date(this.calYear, this.calMonth, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  canShiftCalBack(): boolean {
    const todayK = this.localTodayKey();
    const minDate = this.shiftDateKey(todayK, -29);
    const minD = new Date(minDate + 'T00:00:00');
    return this.calYear > minD.getFullYear() ||
      (this.calYear === minD.getFullYear() && this.calMonth > minD.getMonth());
  }

  canShiftCalForward(): boolean {
    const now = new Date();
    return this.calYear < now.getFullYear() ||
      (this.calYear === now.getFullYear() && this.calMonth < now.getMonth());
  }

  shiftCal(delta: number) {
    let m = this.calMonth + delta;
    let y = this.calYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    this.calMonth = m;
    this.calYear = y;
  }

  toggleCal(e: Event) {
    e.stopPropagation();
    this.showCal = !this.showCal;
    if (this.showCal) {
      const d = new Date(this.selectedDate + 'T00:00:00');
      this.calYear = d.getFullYear();
      this.calMonth = d.getMonth();
    }
  }

  selectCalDate(date: string) {
    this.selectedDate = date;
    this.showCal = false;
  }

  calCells(): Array<{ key: string; date: string | null; day: number; isSelected: boolean; isToday: boolean; inRange: boolean; dotStatus: string }> {
    const firstDow = new Date(this.calYear, this.calMonth, 1).getDay(); // 0=Sun
    const startOffset = (firstDow + 6) % 7; // Mon-first
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const todayK = this.localTodayKey();
    const minDate = this.shiftDateKey(todayK, -29);
    const pad = (n: number) => String(n).padStart(2, '0');

    const cells: Array<{ key: string; date: string | null; day: number; isSelected: boolean; isToday: boolean; inRange: boolean; dotStatus: string }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ key: `e${i}`, date: null, day: 0, isSelected: false, isToday: false, inRange: false, dotStatus: 'none' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${this.calYear}-${pad(this.calMonth + 1)}-${pad(d)}`;
      const inRange = dateKey >= minDate && dateKey <= todayK;
      cells.push({
        key: dateKey, date: dateKey, day: d,
        isSelected: dateKey === this.selectedDate,
        isToday: dateKey === todayK,
        inRange,
        dotStatus: inRange ? this.dotStatusFor(dateKey) : 'none',
      });
    }
    return cells;
  }

  dotStatusFor(date: string): string {
    if (this.allHabits.length === 0) return 'none';
    const isOff = this.allHabits.some((h) => h.history.find((d) => d.date === date)?.off);
    if (isOff) return 'trip';
    const dow = new Date(date + 'T00:00:00').getDay();
    const scheduled = this.allHabits.filter((h) => h.weekdays.includes(dow));
    if (scheduled.length === 0) return 'none';
    const isToday = date === this.localTodayKey();
    const done = scheduled.filter((h) =>
      isToday ? h.doneToday : !!h.history.find((d) => d.date === date)?.done
    ).length;
    if (done === scheduled.length) return 'green';
    if (done > 0) return 'partial';
    return 'red';
  }

  private shiftDateKey(dateKey: string, delta: number): string {
    const d = new Date(dateKey + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Habits whose weekdays include selectedDate's day-of-week, sorted by startTime ascending.
  // Habits without a startTime go to the end.
  scheduledForSelected(): Habit[] {
    const dow = this.dowFor(this.selectedDate);
    return this.allHabits.filter((h) => h.weekdays.includes(dow)).sort(this.byStartTime);
  }

  notScheduledForSelected(): Habit[] {
    const dow = this.dowFor(this.selectedDate);
    return this.allHabits.filter((h) => !h.weekdays.includes(dow)).sort(this.byStartTime);
  }

  private byStartTime = (a: Habit, b: Habit): number => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  };

  // True when the selected date overlaps a trip plan (auto-detected by the backend).
  // For today we use the response's isOffToday; for past dates we use the history cell's `off` flag.
  isSelectedDateOff(): boolean {
    if (this.allHabits.length === 0) return false;
    if (this.selectedDate === this.localTodayKey()) {
      return this.allHabits.some((h) => h.isOffToday);
    }
    return this.allHabits.some((h) => h.history.find((d) => d.date === this.selectedDate)?.off);
  }

  // For today, trust h.doneToday; for past dates, look up the history cell.
  isDoneOnSelected(h: Habit): boolean {
    if (this.selectedDate === this.localTodayKey()) return h.doneToday;
    const cell = h.history.find((d) => d.date === this.selectedDate);
    return !!cell?.done;
  }

  doneCountSelected(): number {
    return this.scheduledForSelected().filter((h) => this.isDoneOnSelected(h)).length;
  }

  ngOnInit() {
    this.sub = this.habitService.habits$.subscribe((habits) => {
      this.allHabits = habits;
    });
    this.habitService.loadAll().subscribe();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  openAdd() { this.editing = null; this.showForm = true; }
  openEdit(h: Habit) { this.editing = h; this.showForm = true; }
  closeForm() { this.showForm = false; this.editing = null; }
  onSaved() { this.closeForm(); this.toast.success('Saved'); }

  // Toggle a habit's completion for the currently-selected date. Uses toggleToday when
  // the selected date is today (so the toast streak message is correct), toggleDate otherwise.
  toggleSelected(h: Habit) {
    if (this.selectedDate === this.localTodayKey()) {
      const wasDone = h.doneToday;
      this.habitService.toggleToday(h.id).subscribe({
        next: (u) => {
          if (u.doneToday && !wasDone) this.toast.success(`Nice — ${u.streak}-day streak`);
        },
      });
    } else {
      const wasDone = this.isDoneOnSelected(h);
      this.habitService.toggleDate(h.id, this.selectedDate).subscribe({
        next: () => {
          if (!wasDone) this.toast.success(`Backfilled ${this.selectedLabel}`);
        },
      });
    }
  }

  toggleDate(h: Habit, date: string) {
    this.habitService.toggleDate(h.id, date).subscribe();
  }

  askDelete(h: Habit) {
    this.deletingId = h.id;
    this.deletingTitle = h.title;
    this.showDelete = true;
  }

  confirmDelete() {
    this.habitService.delete(this.deletingId).subscribe({
      next: () => this.toast.success('Habit deleted'),
    });
    this.showDelete = false;
  }

  timeLabel(h: Habit): string {
    if (h.startTime && h.endTime) return `${h.startTime} - ${h.endTime}`;
    return h.startTime ?? h.endTime ?? '';
  }

  scheduleLabel(h: Habit): string {
    if (h.weekdays.length === 7) return 'Every day';
    if (h.weekdays.length === 5 && [1, 2, 3, 4, 5].every((d) => h.weekdays.includes(d))) return 'Weekdays';
    if (h.weekdays.length === 2 && h.weekdays.includes(0) && h.weekdays.includes(6)) return 'Weekends';
    return WEEKDAY_VALUES.filter((v) => h.weekdays.includes(v))
      .map((v) => WEEKDAY_LABELS[WEEKDAY_VALUES.indexOf(v)])
      .join(', ');
  }
}
