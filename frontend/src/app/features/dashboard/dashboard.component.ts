// Import Angular core utilities: Component, inject for DI, OnInit lifecycle, signal for reactive state
import { Component, inject, OnInit, signal } from '@angular/core';
// HttpClient for making direct API calls to the dashboard stats endpoint
import { HttpClient } from '@angular/common/http';
// RouterLink creates navigable links to the tasks and goals pages
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
// DatePipe formats dates; DecimalPipe formats the goal progress percentage
import { DatePipe, DecimalPipe } from '@angular/common';
// FormsModule is imported for potential future use (not currently used in this template)
import { FormsModule } from '@angular/forms';
// AuthService provides the current user signal for the personalized greeting
import { AuthService } from '../../core/services/auth.service';
// TaskService fetches today's tasks for the timeline view
import { TaskService } from '../tasks/task.service';
// GoalService fetches active goals for the progress summary section
import { GoalService } from '../goals/goal.service';
// HabitService fetches habits for the consistency widget
import { HabitService } from '../habits/habit.service';
// Habit model for typing
import { Habit } from '../../core/models/habit.model';
// Environment config provides the base API URL for the stats endpoint
import { environment } from '../../../environments/environment';
// Task model and PLAN_TYPES for type-specific icons and colors in the timeline
import { Task, PLAN_TYPES } from '../../core/models/task.model';
// Goal model for typing the active goals signal
import { Goal } from '../../core/models/goal.model';
// ModalComponent for the "Add Plan" dialog
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
// TaskFormComponent renders the task creation form inside the modal
import { TaskFormComponent } from '../tasks/task-form/task-form.component';
import { computed } from '@angular/core';

// Shape of the dashboard statistics returned by the /dashboard/stats endpoint
interface Stats { totalTasks: number; completedToday: number; activeTasks: number; activeGoals: number; }

// DashboardComponent is the main landing page ("Today" view) for authenticated users.
// It displays a personalized greeting, quick stats cards, today's schedule as a timeline,
// active goals with progress bars, and a button to quickly add a new plan.
@Component({
  selector: 'app-dashboard', // Loaded by the router at /dashboard
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule, ModalComponent, TaskFormComponent], // Template dependencies
  template: `
    <!-- Page container with fade-in animation (defined in global styles.css) -->
    @if (loading()) {
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p>Loading your plans...</p>
        <span class="loading-hint">First load may take ~30s if the server was sleeping</span>
      </div>
    }
    <div class="page animate-in" [style.display]="loading() ? 'none' : ''">
      <!-- Header row: personalized greeting on the left, "Add Plan" button on the right -->
      <div class="today-header">
        <div>
          <!-- Dynamic greeting based on time of day (morning/afternoon/evening) -->
          <h1>Good {{ greeting }}, {{ auth.currentUser()?.displayName ?? 'there' }}</h1>
          <!-- Today's full date displayed below the greeting -->
          <p>{{ today | date:'EEEE, MMMM d, y' }}</p>
        </div>
        <!-- Button opens the modal with a TaskFormComponent to create a new plan -->
        <button class="btn-primary" (click)="showAddPlan = true">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Plan
        </button>
      </div>

      <!-- Quick stats row: four cards showing key metrics at a glance -->
      <div class="quick-stats">
        <a routerLink="/tasks" class="qs-item">
          <span class="qs-num">{{ stats()?.activeTasks ?? 0 }}</span>
          <span class="qs-label">Active Plans</span>
        </a>
        <a routerLink="/tasks" class="qs-item">
          <span class="qs-num">{{ stats()?.completedToday ?? 0 }}</span>
          <span class="qs-label">Done Today</span>
        </a>
        <a routerLink="/goals" class="qs-item">
          <span class="qs-num">{{ stats()?.activeGoals ?? 0 }}</span>
          <span class="qs-label">Goals</span>
        </a>
      </div>

      <!-- Daily Routine widget: progress ring + interactive today's checklist + 30-day heatmap -->
      @if (habits().length > 0) {
        <div class="card habits-card">
          <div class="timeline-header">
            <h2>Daily Routine</h2>
            <a routerLink="/habits" class="link">All habits →</a>
          </div>
          <div class="habits-body">
            <!-- Hero: progress ring on the left, secondary stats on the right -->
            <div class="hero">
              <div class="ring-wrap">
                <svg viewBox="0 0 100 100" class="ring">
                  <circle cx="50" cy="50" r="42" class="ring-bg" />
                  <circle cx="50" cy="50" r="42" class="ring-fg"
                    [attr.stroke-dasharray]="ringCirc"
                    [attr.stroke-dashoffset]="ringOffset()" />
                </svg>
                <div class="ring-center">
                  <span class="ring-num">{{ doneToday() }}<span class="ring-denom">/{{ scheduledToday() }}</span></span>
                  <span class="ring-label">today</span>
                </div>
              </div>
              <div class="hero-stats">
                <div class="hs-row">
                  <span class="hs-num">{{ consistency30() | number:'1.0-0' }}%</span>
                  <span class="hs-label">30-day consistency</span>
                </div>
                <div class="hs-row">
                  <span class="hs-num">🔥 {{ bestStreak() }}</span>
                  <span class="hs-label">best current streak</span>
                </div>
                <div class="hs-row">
                  <span class="hs-num">{{ habits().length }}</span>
                  <span class="hs-label">total habits</span>
                </div>
              </div>
            </div>

            <!-- Today's checklist: click a row to toggle done. Optimistic update makes it instant. -->
            <div class="today-block">
              <div class="today-block-label">Today's checklist</div>
              @if (todayHabits().length === 0) {
                <div class="today-empty">No habits scheduled today. Enjoy the day off!</div>
              } @else {
                <div class="today-list">
                  @for (h of todayHabits(); track h.id) {
                    <button class="th-row" [class.done]="h.doneToday" (click)="toggleHabit(h)">
                      <span class="th-check" [style.--ring]="h.color" [style.background]="h.doneToday ? h.color : 'transparent'">
                        @if (h.doneToday) {
                          <svg width="10" height="10" fill="none" stroke="#fff" stroke-width="3.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        }
                      </span>
                      <span class="th-icon" [style.background]="h.color + '22'" [style.color]="h.color">{{ h.icon }}</span>
                      <span class="th-title">{{ h.title }}</span>
                      @if (habitTimeLabel(h)) {
                        <span class="th-time">{{ habitTimeLabel(h) }}</span>
                      }
                      <span class="th-streak" [class.lit]="h.streak > 0">🔥 {{ h.streak }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            <!-- 30-day rollup heatmap: each cell = % of habits scheduled that day that got done -->
            <div class="heatmap-block">
              <div class="heatmap-label">Last 30 days</div>
              <div class="heatmap-row">
                @for (cell of heatmap(); track cell.date) {
                  <span class="hm-cell"
                    [style.background]="cell.color"
                    [title]="cell.tooltip"></span>
                }
              </div>
              <div class="heatmap-legend">
                <span>Less</span>
                <span class="lg-cell" style="background: var(--bg-hover)"></span>
                <span class="lg-cell" style="background: rgba(16,185,129,0.25)"></span>
                <span class="lg-cell" style="background: rgba(16,185,129,0.55)"></span>
                <span class="lg-cell" style="background: rgba(16,185,129,0.85)"></span>
                <span class="lg-cell" style="background: rgba(16,185,129,1)"></span>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Today's Schedule: timeline of tasks/plans due today, sorted by start time -->
      <div class="card timeline-card">
        <div class="timeline-header">
          <h2>Today's Schedule</h2>
          <!-- Link to the full tasks list page -->
          <a routerLink="/tasks" class="link">View all plans</a>
        </div>

        <!-- Empty state when no plans are scheduled for today -->
        @if (todayPlans().length === 0) {
          <div class="empty">
            <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p>No plans for today. Add one above!</p>
          </div>
        } @else {
          <!-- Timeline: vertical list of today's plans with time indicators and connecting lines -->
          <div class="timeline">
            @for (plan of todayPlans(); track plan.id) {
              <!-- Each timeline item: time column | connecting line | content column -->
              <div class="tl-item" [class.done]="plan.status === 'DONE'">
                <!-- Time column: shows start time and optional end time -->
                <div class="tl-time">
                  @if (plan.startTime) {
                    <span class="tl-hour">{{ plan.startTime }}</span>
                    @if (plan.endTime) { <span class="tl-to">{{ plan.endTime }}</span> }
                  } @else {
                    <!-- Placeholder for plans with no specific time -->
                    <span class="tl-hour tl-anytime">--:--</span>
                  }
                </div>
                <!-- Connecting line column: colored dot + vertical line between items -->
                <div class="tl-line">
                  <div class="tl-dot" [style.background]="getPlanColor(plan.type)"></div>
                </div>
                <!-- Content column: plan type badge, priority badge, title, location, description -->
                <div class="tl-content">
                  <div class="tl-top">
                    <!-- Plan type chip with type-specific color and icon -->
                    <span class="tl-type" [style.background]="getPlanColor(plan.type) + '18'" [style.color]="getPlanColor(plan.type)">
                      {{ getPlanIcon(plan.type) }} {{ getPlanLabel(plan.type) }}
                    </span>
                    <!-- Priority badge (color-coded: red=HIGH, amber=MEDIUM, green=LOW) -->
                    <span class="badge badge-{{ plan.priority.toLowerCase() }}">{{ plan.priority }}</span>
                  </div>
                  <span class="tl-title">{{ plan.title }}</span>
                  <!-- Optional location with a map pin icon -->
                  @if (plan.location) {
                    <span class="tl-location">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {{ plan.location }}
                    </span>
                  }
                  <!-- Optional description shown as truncated muted text -->
                  @if (plan.description) {
                    <span class="tl-desc">{{ plan.description }}</span>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Goal Progress section: only shown when there are active goals -->
      @if (activeGoals().length > 0) {
        <div class="card goals-card">
          <div class="timeline-header">
            <h2>Goal Progress</h2>
            <!-- Link to the full goals list page -->
            <a routerLink="/goals" class="link">All goals</a>
          </div>
          <div class="goals-list">
            <!-- Show up to 4 active goals with progress bars -->
            @for (goal of activeGoals(); track goal.id) {
              <a [routerLink]="['/goals', goal.id]" class="goal-row">
                <div class="goal-info">
                  <span class="goal-name">{{ goal.title }}</span>
                  <span class="goal-meta">{{ goal.milestones.length }} milestones</span>
                </div>
                <!-- Progress bar: width based on goal.progress percentage -->
                <div class="goal-progress-wrap">
                  <div class="goal-bar"><div class="goal-fill" [style.width.%]="goal.progress"></div></div>
                  <span class="goal-pct">{{ goal.progress | number:'1.0-0' }}%</span>
                </div>
              </a>
            }
          </div>
        </div>
      }

    </div>

    <!-- Modal for adding a new plan — wraps the TaskFormComponent -->
    <app-modal [isOpen]="showAddPlan" title="Add New Plan" (close)="showAddPlan = false" maxWidth="560px">
      <app-task-form (saved)="onPlanAdded()" (cancelled)="showAddPlan = false" />
    </app-modal>
  `,
  styles: [`
    /* Header: space-between layout for greeting text and add button */
    .today-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .today-header h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 2px; }
    .today-header p { color: var(--text-secondary); font-size: 0.9rem; }

    /* Quick stats row: four equal-width cards */
    .quick-stats { display: flex; gap: 1rem; flex-wrap: wrap; }
    @media (max-width: 768px) {
      .quick-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
      .qs-num { font-size: 1.25rem; }
      .today-header { flex-direction: column; gap: 12px; }
      .today-header h1 { font-size: 1.2rem; }
      .panels { grid-template-columns: 1fr; }
      .tl-time { width: 45px; }
      .tl-hour { font-size: 0.75rem; }
    }
    .qs-item { flex: 1; padding: 1rem 1.25rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); display: flex; flex-direction: column; text-decoration: none; cursor: pointer; transition: all 0.15s; }
    .qs-item:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    /* Large number display for the stat value */
    .qs-num { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    /* Small label below the number */
    .qs-label { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

    /* Timeline card: no extra overflow so the card border contains the timeline */
    .timeline-card { overflow: hidden; }
    /* Timeline header: title + "View all" link */
    .timeline-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .timeline-header h2 { font-size: 1rem; font-weight: 600; }
    .link { font-size: 0.8rem; color: var(--accent); font-weight: 600; }

    /* Timeline container */
    .timeline { padding: 0.5rem 0; }
    /* Each timeline row: horizontal flex of time | line | content */
    .tl-item { display: flex; gap: 0; padding: 0.75rem 1.5rem; transition: background 0.1s; }
    .tl-item:hover { background: var(--bg-hover); }
    /* Done items: strikethrough title and reduced opacity */
    .tl-item.done .tl-title { text-decoration: line-through; color: var(--text-muted); }
    .tl-item.done .tl-content { opacity: 0.6; }

    /* Time column: fixed width, right-aligned text */
    .tl-time { width: 60px; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; padding-right: 12px; padding-top: 2px; }
    .tl-hour { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }
    .tl-to { font-size: 0.7rem; color: var(--text-muted); }
    .tl-anytime { color: var(--text-muted); }

    /* Connecting line column: dot + vertical line between items */
    .tl-line { width: 20px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; position: relative; }
    .tl-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
    /* Vertical connecting line between timeline dots (hidden for the last item) */
    .tl-line::after { content: ''; position: absolute; top: 18px; bottom: -12px; width: 2px; background: var(--border); }
    .tl-item:last-child .tl-line::after { display: none; }

    /* Content column: plan details */
    .tl-content { flex: 1; padding-left: 10px; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .tl-top { display: flex; align-items: center; gap: 6px; }
    /* Plan type chip: semi-transparent background with type-specific color */
    .tl-type { font-size: 0.68rem; font-weight: 600; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
    .tl-title { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); }
    .tl-location { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--text-muted); }
    .tl-desc { font-size: 0.78rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Goals card section */
    .goals-card { overflow: hidden; }
    .goals-list { padding: 0.5rem; }
    /* Each goal row: clickable link with progress bar */
    .goal-row { display: flex; align-items: center; gap: 1rem; padding: 10px 12px; border-radius: 8px; text-decoration: none; transition: background 0.1s; }
    .goal-row:hover { background: var(--bg-hover); }
    .goal-info { flex: 1; min-width: 0; }
    .goal-name { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .goal-meta { display: block; font-size: 0.72rem; color: var(--text-muted); }
    /* Progress bar area: fixed width on the right side */
    .goal-progress-wrap { display: flex; align-items: center; gap: 8px; width: 140px; flex-shrink: 0; }
    .goal-bar { flex: 1; height: 6px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden; }
    /* Filled portion of the progress bar — width set dynamically via [style.width.%] */
    .goal-fill { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.4s; }
    .goal-pct { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); width: 32px; text-align: right; }

    /* Empty state: centered message with icon */
    .empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 3rem 1.5rem; color: var(--text-muted); font-size: 0.9rem; text-align: center; }

    .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 4rem 2rem; }
    .loading-spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-screen p { font-size: 0.95rem; font-weight: 500; color: var(--text-primary); }
    .loading-hint { font-size: 0.78rem; color: var(--text-muted); }

    /* --- Daily Routine widget (redesigned) --- */
    .habits-card { overflow: hidden; }
    .habits-body { padding: 1.25rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

    /* Hero row: progress ring + secondary stats */
    .hero { display: flex; gap: 1.5rem; align-items: center; }
    .ring-wrap { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
    .ring { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: var(--bg-secondary); stroke-width: 8; }
    .ring-fg { fill: none; stroke: var(--accent); stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
    .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ring-num { font-size: 1.85rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .ring-denom { font-size: 1rem; font-weight: 500; color: var(--text-muted); }
    .ring-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }

    .hero-stats { flex: 1; display: flex; flex-direction: column; gap: 0.65rem; }
    .hs-row { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: 8px 12px; background: var(--bg-secondary); border-radius: 8px; }
    .hs-num { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
    .hs-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

    /* Today's checklist */
    .today-block { display: flex; flex-direction: column; gap: 6px; }
    .today-block-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
    .today-empty { padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-secondary); border-radius: 8px; }
    /* Two-column compact grid; collapses to one column on narrow screens */
    .today-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; }
    .th-row {
      display: flex; align-items: center; gap: 8px; padding: 5px 8px;
      background: transparent; border: 1px solid transparent; border-radius: 6px;
      width: 100%; text-align: left; cursor: pointer; transition: all 0.15s;
      font-family: inherit; color: inherit; min-width: 0;
    }
    .th-row:hover { background: var(--bg-hover); border-color: var(--border); }
    .th-row.done { opacity: 0.55; }
    .th-row.done .th-title { text-decoration: line-through; color: var(--text-muted); }

    .th-check {
      width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--ring, var(--accent));
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: background 0.15s;
    }
    .th-icon { width: 22px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .th-title { flex: 1; min-width: 0; font-size: 0.83rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .th-time { font-size: 0.7rem; color: var(--text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; flex-shrink: 0; }
    .th-streak {
      font-size: 0.7rem; font-weight: 600; color: var(--text-muted);
      background: var(--bg-secondary); padding: 2px 6px; border-radius: 8px;
      transition: color 0.2s; flex-shrink: 0;
    }
    .th-streak.lit { color: #f97316; }

    @media (max-width: 900px) {
      .today-list { grid-template-columns: 1fr; }
    }

    /* 30-day heatmap row */
    .heatmap-block { display: flex; flex-direction: column; gap: 6px; }
    .heatmap-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
    .heatmap-row { display: grid; grid-template-columns: repeat(30, 1fr); gap: 3px; }
    .hm-cell { aspect-ratio: 1; border-radius: 3px; transition: transform 0.1s; cursor: default; }
    .hm-cell:hover { transform: scale(1.4); z-index: 1; position: relative; }
    .heatmap-legend { display: flex; align-items: center; gap: 4px; font-size: 0.68rem; color: var(--text-muted); justify-content: flex-end; margin-top: 2px; }
    .lg-cell { width: 10px; height: 10px; border-radius: 2px; }

    @media (max-width: 768px) {
      .hero { flex-direction: column; align-items: stretch; }
      .ring-wrap { align-self: center; }
      .heatmap-row { grid-template-columns: repeat(15, 1fr); }
    }
  `],
})
export class DashboardComponent implements OnInit {
  // Expose AuthService publicly so the template can read currentUser() for the greeting
  auth = inject(AuthService);
  // HttpClient for fetching dashboard stats directly (no dedicated service for this one-off call)
  private http = inject(HttpClient);
  // TaskService for fetching today's tasks for the timeline
  private taskService = inject(TaskService);
  // GoalService for fetching active goals for the progress section
  private goalService = inject(GoalService);
  // HabitService for the Daily Routine consistency widget
  private habitService = inject(HabitService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  stats = signal<Stats | null>(null);
  // Reactive signal holding today's tasks sorted by start time
  todayPlans = signal<Task[]>([]);
  // Reactive signal holding the first 4 active goals for the progress summary
  activeGoals = signal<Goal[]>([]);
  // Reactive signal holding the user's active habits for the consistency widget
  habits = signal<Habit[]>([]);

  // --- Habit widget computeds ---
  todayHabits = computed(() =>
    this.habits()
      .filter((h) => h.scheduledToday)
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      })
  );
  scheduledToday = computed(() => this.todayHabits().length);
  doneToday = computed(() => this.todayHabits().filter((h) => h.doneToday).length);
  todayPct = computed(() => {
    const total = this.scheduledToday();
    return total === 0 ? 0 : (this.doneToday() / total) * 100;
  });

  // SVG ring math: circumference of r=42 circle. Offset shrinks as completion grows.
  readonly ringCirc = 2 * Math.PI * 42;
  ringOffset = computed(() => this.ringCirc * (1 - this.todayPct() / 100));

  toggleHabit(h: Habit) {
    const wasDone = h.doneToday;
    this.habitService.toggleToday(h.id).subscribe({
      next: (u) => {
        if (u.doneToday && !wasDone) this.toast.success(`Nice — ${u.streak}-day streak`);
      },
    });
  }

  // 30-day consistency: total completed scheduled days / total scheduled days across all habits.
  consistency30 = computed(() => {
    let scheduledSlots = 0;
    let doneSlots = 0;
    for (const h of this.habits()) {
      for (const d of h.history) {
        if (d.scheduled) {
          scheduledSlots++;
          if (d.done) doneSlots++;
        }
      }
    }
    return scheduledSlots === 0 ? 0 : (doneSlots / scheduledSlots) * 100;
  });

  bestStreak = computed(() => this.habits().reduce((max, h) => Math.max(max, h.streak), 0));
  // Bar width caps at 30 days for visual scale
  bestStreakBar = computed(() => Math.min(100, (this.bestStreak() / 30) * 100));

  // 30-day aggregate heatmap: for each calendar day, what fraction of habits scheduled
  // for that day were actually completed. Cell color intensity scales with that fraction.
  heatmap = computed<{ date: string; color: string; tooltip: string }[]>(() => {
    const habits = this.habits();
    if (habits.length === 0) return [];
    // History arrays are aligned (server returns 30 most recent days, oldest first).
    const len = habits[0].history.length;
    const cells: { date: string; color: string; tooltip: string }[] = [];
    for (let i = 0; i < len; i++) {
      const date = habits[0].history[i].date;
      let scheduled = 0;
      let done = 0;
      for (const h of habits) {
        const cell = h.history[i];
        if (cell?.scheduled) {
          scheduled++;
          if (cell.done) done++;
        }
      }
      const ratio = scheduled === 0 ? -1 : done / scheduled; // -1 = no habits scheduled that day
      cells.push({
        date,
        color: this.heatColor(ratio),
        tooltip: scheduled === 0 ? `${date} · rest day` : `${date} · ${done}/${scheduled} done`,
      });
    }
    return cells;
  });

  habitTimeLabel(h: Habit): string {
    if (h.startTime && h.endTime) return `${h.startTime} - ${h.endTime}`;
    return h.startTime ?? h.endTime ?? '';
  }

  private heatColor(ratio: number): string {
    if (ratio < 0) return 'var(--bg-hover)'; // rest day — no habits scheduled
    if (ratio === 0) return 'rgba(239, 68, 68, 0.18)'; // scheduled but none done — faint red
    // Linear blend from a pale accent (low completion) to solid accent (full completion).
    const alpha = 0.25 + ratio * 0.75; // 0.25 → 1.0
    return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
  }
  // Controls visibility of the "Add Plan" modal
  showAddPlan = false;
  // Today's date object used by the DatePipe in the header
  today = new Date();
  // Reference to the PLAN_TYPES array for looking up icons and colors
  planTypes = PLAN_TYPES;

  // Computed greeting based on the current hour: morning (0-11), afternoon (12-17), evening (18-23)
  get greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }

  // Load all dashboard data on component initialization
  ngOnInit() {
    this.loadAll();
    // Subscribe to the shared habits stream so toggles from anywhere reflect here too.
    this.habitService.habits$.subscribe((habits) => this.habits.set(habits));
    // Handle Google Calendar OAuth callback redirect
    if (this.route.snapshot.queryParams['gcal'] === 'connected') {
      this.toast.success('Google Calendar connected! Your plans will now sync automatically.');
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  // Fetch stats, today's tasks, and active goals in parallel
  loading = signal(true);

  loadAll() {
    this.loading.set(true);
    let loaded = 0;
    const checkDone = () => { loaded++; if (loaded >= 3) this.loading.set(false); };

    this.http.get<Stats>(`${environment.apiUrl}/dashboard/stats`).subscribe({
      next: (s) => { this.stats.set(s); checkDone(); },
      error: () => { checkDone(); this.retryOnce(); },
    });
    this.taskService.getToday().subscribe({
      next: (t) => {
        const sorted = t.sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
        this.todayPlans.set(sorted);
        checkDone();
      },
      error: () => checkDone(),
    });
    this.goalService.loadAll().subscribe({
      next: (goals) => { this.activeGoals.set(goals.filter((g: Goal) => g.status === 'ACTIVE').slice(0, 4)); checkDone(); },
      error: () => checkDone(),
    });
    // Habits load is fire-and-forget; the widget hides itself if there are no habits,
    // so its arrival doesn't gate the loading screen.
    this.habitService.loadAll().subscribe({ error: () => {} });
  }

  // Retry once after 3 seconds if first load fails (handles Render cold start)
  private retryOnce() {
    setTimeout(() => this.loadAll(), 3000);
  }

  // Called when a new plan is saved via the modal — close the modal and refresh all data
  onPlanAdded() { this.showAddPlan = false; this.loadAll(); }

  // Helper methods to look up plan type metadata (color, icon, label) from the PLAN_TYPES array
  getPlanColor(type: string): string { return this.planTypes.find((t) => t.value === type)?.color ?? '#3b82f6'; }
  getPlanIcon(type: string): string { return this.planTypes.find((t) => t.value === type)?.icon ?? '✓'; }
  getPlanLabel(type: string): string { return this.planTypes.find((t) => t.value === type)?.label ?? 'Task'; }
}
