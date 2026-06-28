import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AnalyticsService } from '../analytics.service';
import { AnalyticsRange, AnalyticsSummary } from '../../../core/models/analytics.model';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="page animate-in">

      <!-- Header -->
      <div class="page-header">
        <div>
          <p class="date-range">{{ dateRangeLabel() }}</p>
        </div>
        <div class="range-pills">
          @for (r of ranges; track r) {
            <button class="range-pill" [class.active]="range() === r" (click)="setRange(r)">{{ rangeLabel(r) }}</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Crunching the numbers…</span>
        </div>
      } @else if (summary()) {

        <!-- 6 KPI Cards -->
        <div class="kpi-grid">

          <div class="kpi-card">
            <div class="kpi-icon tasks-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ summary()!.tasks.completed }}</span>
              <span class="kpi-label">Tasks Completed</span>
            </div>
            <div class="kpi-foot">
              <span class="kpi-delta" [class.up]="summary()!.tasks.delta > 0" [class.down]="summary()!.tasks.delta < 0">
                {{ formatDelta(summary()!.tasks.delta) }} vs prev
              </span>
              <span class="kpi-sub">{{ summary()!.tasks.avgPerDay }}/day avg</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon habits-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ summary()!.habits.consistencyPct | number:'1.0-0' }}<small>%</small></span>
              <span class="kpi-label">Habit Consistency</span>
            </div>
            <div class="kpi-foot">
              <span class="kpi-sub">{{ summary()!.habits.activeHabits }} active habit{{ summary()!.habits.activeHabits === 1 ? '' : 's' }}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon streak-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ summary()!.habits.bestStreak }}</span>
              <span class="kpi-label">Best Streak</span>
            </div>
            <div class="kpi-foot">
              @if (summary()!.habits.bestStreakHabit) {
                <span class="kpi-sub streak-hab">{{ summary()!.habits.bestStreakHabit }}</span>
              } @else {
                <span class="kpi-sub">No active streaks</span>
              }
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon journal-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ summary()!.journal.entries }}</span>
              <span class="kpi-label">Journal Entries</span>
            </div>
            <div class="kpi-foot">
              <span class="kpi-sub">{{ (summary()!.journal.ratio * 100) | number:'1.0-0' }}% of days covered</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon revenue-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ formatINR(summary()!.projects.revenue) }}</span>
              <span class="kpi-label">Revenue</span>
            </div>
            <div class="kpi-foot">
              <span class="kpi-sub">{{ summary()!.projects.completed }} project{{ summary()!.projects.completed === 1 ? '' : 's' }} · {{ summary()!.projects.payments }} payment{{ summary()!.projects.payments === 1 ? '' : 's' }}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon goals-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ summary()!.goals.completed }}<small>/{{ summary()!.goals.total }}</small></span>
              <span class="kpi-label">Goals Achieved</span>
            </div>
            <div class="kpi-foot">
              <div class="goals-progress-bar">
                <div class="goals-progress-fill" [style.width.%]="summary()!.goals.total > 0 ? (summary()!.goals.completed / summary()!.goals.total) * 100 : 0"></div>
              </div>
              <span class="kpi-sub">{{ summary()!.goals.avgProgress }}% avg progress</span>
            </div>
          </div>

        </div>

        <!-- Daily Activity Chart (SVG) -->
        <div class="card chart-card">
          <div class="chart-header">
            <div>
              <h3>Daily Activity</h3>
              <p class="chart-sub">Routine check-ins and journal entries across the period</p>
            </div>
            <div class="chart-legend">
              <span class="leg-item"><span class="leg-swatch habits-sw"></span>Routine</span>
              <span class="leg-item"><span class="leg-dot journal-sw"></span>Journal</span>
            </div>
          </div>
          <div class="chart-wrap">
            <svg class="activity-svg" [attr.viewBox]="'0 0 ' + chartWidth() + ' 160'" preserveAspectRatio="none">
              <!-- Grid lines -->
              <line x1="0" y1="0" [attr.x2]="chartWidth()" y2="0" class="grid-line"/>
              <line x1="0" y1="40" [attr.x2]="chartWidth()" y2="40" class="grid-line"/>
              <line x1="0" y1="80" [attr.x2]="chartWidth()" y2="80" class="grid-line"/>
              <line x1="0" y1="120" [attr.x2]="chartWidth()" y2="120" class="grid-line"/>
              <!-- Task bars -->
              @for (b of chartBars(); track b.date) {
                <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="2" class="task-bar">
                  <title>{{ b.date }} · {{ b.habits }} routine check-in{{ b.habits === 1 ? '' : 's' }}</title>
                </rect>
                @if (b.journal) {
                  <circle [attr.cx]="b.x + b.w / 2" cy="150" r="3" class="journal-dot-svg">
                    <title>Journal entry</title>
                  </circle>
                }
              }
            </svg>
            @if (showDateLabels()) {
              <div class="date-labels" [style.grid-template-columns]="'repeat(' + summary()!.dailyActivity.length + ', 1fr)'">
                @for (d of summary()!.dailyActivity; track d.date) {
                  <span class="date-lbl">{{ shortDay(d.date) }}</span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Bottom 3-column grid -->
        <div class="bottom-grid">

          <!-- Routine by Weekday -->
          <div class="card bottom-card">
            <h3>Routine by Weekday</h3>
            <p class="section-sub">Habit check-ins per day of week</p>
            <div class="weekday-chart">
              @for (w of weekdayHabitBars(); track w.weekday) {
                <div class="wd-col" [class.wd-best]="w.isBest">
                  <span class="wd-count">{{ w.total > 0 ? w.total : '' }}</span>
                  <div class="wd-bar-wrap">
                    <div class="wd-bar" [style.height.%]="w.heightPct"></div>
                  </div>
                  <span class="wd-label">{{ w.label }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Activity Mix -->
          <div class="card bottom-card">
            <h3>Activity Mix</h3>
            <p class="section-sub">Days active across all modules</p>
            <div class="mix-list">
              @for (m of activityMix(); track m.label) {
                <div class="mix-row">
                  <div class="mix-label-row">
                    <span class="mix-icon" [style.background]="m.bg" [style.color]="m.color">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path [attr.d]="m.icon"/></svg>
                    </span>
                    <span class="mix-name">{{ m.label }}</span>
                    <span class="mix-stat">{{ m.days }} / {{ m.total }} days</span>
                    <span class="mix-pct">{{ m.pct }}%</span>
                  </div>
                  <div class="mix-bar-wrap">
                    <div class="mix-bar-fill" [style.background]="m.color" [style.width.%]="m.pct"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Goals + Insights -->
          <div class="card bottom-card">
            <h3>Goals Overview</h3>
            <p class="section-sub">Progress across all your goals</p>
            <div class="goals-breakdown">
              <div class="goals-stat">
                <span class="gs-num">{{ summary()!.goals.active }}</span>
                <span class="gs-label">In Progress</span>
              </div>
              <div class="goals-divider"></div>
              <div class="goals-stat">
                <span class="gs-num completed">{{ summary()!.goals.completed }}</span>
                <span class="gs-label">Achieved</span>
              </div>
              <div class="goals-divider"></div>
              <div class="goals-stat">
                <span class="gs-num">{{ summary()!.goals.total - summary()!.goals.completed - summary()!.goals.active }}</span>
                <span class="gs-label">Not Started</span>
              </div>
            </div>
            <div class="goals-avg-row">
              <span>Avg progress</span>
              <div class="avg-bar-wrap">
                <div class="avg-bar-fill" [style.width.%]="summary()!.goals.avgProgress"></div>
              </div>
              <span class="avg-pct">{{ summary()!.goals.avgProgress }}%</span>
            </div>

            @if (summary()!.insights.length > 0) {
              <div class="insights-divider"></div>
              <h4 class="insights-title">Insights</h4>
              <ul class="insights-list">
                @for (ins of summary()!.insights; track ins) {
                  <li class="insight-item">
                    <span class="ins-dot"></span>
                    {{ ins }}
                  </li>
                }
              </ul>
            }
          </div>

        </div>

      } @else {
        <div class="card empty-card">
          <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.3"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <p>No data yet. Complete tasks, check off habits, and write journal entries to see analytics.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0; }
    .date-range { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

    .range-pills { display: flex; gap: 2px; padding: 3px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border); }
    .range-pill { background: transparent; border: none; padding: 5px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; font-family: inherit; letter-spacing: 0.02em; }
    .range-pill:hover { color: var(--text-primary); }
    .range-pill.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

    .loading-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 5rem; color: var(--text-muted); font-size: 0.9rem; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* KPI Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.75rem; }
    .kpi-card {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 6px;
      position: relative; overflow: hidden; transition: border-color 0.2s;
    }
    .kpi-card:hover { border-color: rgba(16,185,129,0.3); }
    .kpi-icon {
      width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      margin-bottom: 2px;
    }
    .tasks-icon   { background: rgba(99,102,241,0.12); color: #818cf8; }
    .habits-icon  { background: rgba(16,185,129,0.12); color: #34d399; }
    .streak-icon  { background: rgba(249,115,22,0.12); color: #fb923c; }
    .journal-icon { background: rgba(245,158,11,0.12); color: #fbbf24; }
    .revenue-icon { background: rgba(52,211,153,0.12); color: #10b981; }
    .goals-icon   { background: rgba(168,85,247,0.12); color: #c084fc; }

    .kpi-body { display: flex; flex-direction: column; gap: 2px; }
    .kpi-value { font-size: 1.65rem; font-weight: 800; color: var(--text-primary); line-height: 1; letter-spacing: -0.02em; }
    .kpi-value small { font-size: 1rem; font-weight: 500; color: var(--text-muted); margin-left: 1px; }
    .kpi-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; }

    .kpi-foot { display: flex; flex-direction: column; gap: 4px; margin-top: auto; }
    .kpi-delta { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); }
    .kpi-delta.up { color: #34d399; }
    .kpi-delta.down { color: #f87171; }
    .kpi-sub { font-size: 0.7rem; color: var(--text-muted); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .streak-hab { color: var(--text-secondary); }

    .goals-progress-bar { height: 4px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden; }
    .goals-progress-fill { height: 100%; background: #c084fc; border-radius: 99px; transition: width 0.4s; }

    /* Chart card */
    .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
    .chart-card { padding: 1.25rem 1.5rem; }
    .chart-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .chart-header h3 { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-primary); }
    .chart-sub { font-size: 0.75rem; color: var(--text-muted); margin: 3px 0 0; }
    .chart-legend { display: flex; gap: 12px; align-items: center; }
    .leg-item { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: var(--text-muted); }
    .leg-swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
    .habits-sw { background: #10b981; }
    .leg-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
    .journal-sw { background: #f59e0b; }

    .chart-wrap { display: flex; flex-direction: column; gap: 4px; }
    .activity-svg { width: 100%; height: 160px; display: block; overflow: visible; }
    .grid-line { stroke: var(--border); stroke-width: 0.5; }
    .task-bar { fill: #10b981; opacity: 0.8; }
    .task-bar:hover { opacity: 1; }
    .journal-dot-svg { fill: #f59e0b; }

    .date-labels { display: grid; padding: 0 2px; }
    .date-lbl { font-size: 0.58rem; color: var(--text-muted); text-align: center; }

    /* Bottom 3-col grid */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }
    .bottom-card { padding: 1.25rem 1.4rem; display: flex; flex-direction: column; }
    .bottom-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-primary); }
    .section-sub { font-size: 0.72rem; color: var(--text-muted); margin: 3px 0 1rem; }
    .empty-section { font-size: 0.82rem; color: var(--text-muted); padding: 1rem 0; }

    /* Weekday chart */
    .weekday-chart { display: flex; gap: 6px; height: 130px; align-items: flex-end; }
    .wd-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
    .wd-count { font-size: 0.65rem; color: var(--text-muted); font-weight: 600; min-height: 14px; line-height: 1; }
    .wd-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; min-height: 4px; }
    .wd-bar { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 3px; opacity: 0.6; transition: height 0.4s; }
    .wd-col.wd-best .wd-bar { opacity: 1; background: #34d399; }
    .wd-col.wd-best .wd-label { color: #34d399; font-weight: 700; }
    .wd-label { font-size: 0.65rem; color: var(--text-secondary); text-align: center; }

    /* Activity Mix */
    .mix-list { display: flex; flex-direction: column; gap: 14px; }
    .mix-row { display: flex; flex-direction: column; gap: 6px; }
    .mix-label-row { display: flex; align-items: center; gap: 8px; }
    .mix-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mix-name { font-size: 0.82rem; color: var(--text-primary); font-weight: 500; flex: 1; }
    .mix-stat { font-size: 0.72rem; color: var(--text-muted); }
    .mix-pct { font-size: 0.82rem; font-weight: 700; color: var(--text-primary); min-width: 36px; text-align: right; }
    .mix-bar-wrap { height: 6px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden; }
    .mix-bar-fill { height: 100%; border-radius: 99px; opacity: 0.85; transition: width 0.5s; }

    /* Goals + Insights panel */
    .goals-breakdown { display: flex; align-items: stretch; gap: 0; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 0.75rem; }
    .goals-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0.7rem 0.5rem; background: var(--bg-secondary); }
    .goals-divider { width: 1px; background: var(--border); flex-shrink: 0; }
    .gs-num { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .gs-num.completed { color: #34d399; }
    .gs-label { font-size: 0.62rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

    .goals-avg-row { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.75rem; }
    .goals-avg-row > span:first-child { flex-shrink: 0; }
    .avg-bar-wrap { flex: 1; height: 5px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden; }
    .avg-bar-fill { height: 100%; background: #c084fc; border-radius: 99px; transition: width 0.4s; }
    .avg-pct { flex-shrink: 0; font-weight: 700; color: var(--text-primary); }

    .insights-divider { border: none; border-top: 1px solid var(--border); margin: 0.75rem 0; }
    .insights-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin: 0 0 0.5rem; }
    .insights-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .insight-item { display: flex; align-items: flex-start; gap: 8px; font-size: 0.78rem; color: var(--text-primary); line-height: 1.5; }
    .ins-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; margin-top: 5px; flex-shrink: 0; }

    .empty-card { padding: 4rem; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 0.9rem; }

    @media (max-width: 1200px) {
      .kpi-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .bottom-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .kpi-grid { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class AnalyticsPageComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  ranges: AnalyticsRange[] = ['7d', '30d', '90d', '365d'];
  range = signal<AnalyticsRange>('30d');
  summary = signal<AnalyticsSummary | null>(null);
  loading = signal<boolean>(true);

  daysInRange = computed(() => {
    const r = this.range();
    return r === '7d' ? 7 : r === '30d' ? 30 : r === '90d' ? 90 : 365;
  });

  dateRangeLabel = computed(() => {
    const s = this.summary();
    if (!s) return '';
    const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(s.from)} – ${fmt(s.to)}`;
  });

  chartWidth = computed(() => {
    const days = this.summary()?.dailyActivity.length ?? 30;
    return days * 14;
  });

  chartBars = computed(() => {
    const activity = this.summary()?.dailyActivity ?? [];
    const maxHabits = Math.max(1, ...activity.map((d) => d.habits));
    const totalW = this.chartWidth();
    const n = activity.length;
    const barW = Math.max(2, (totalW / n) - 2);
    const chartH = 140;
    return activity.map((d, i) => {
      const h = Math.max(d.habits > 0 ? 3 : 0, Math.round((d.habits / maxHabits) * chartH));
      return {
        date: d.date,
        habits: d.habits,
        journal: d.journal,
        x: i * (totalW / n),
        y: chartH - h,
        w: barW,
        h,
      };
    });
  });

  weekdayHabitBars = computed(() => {
    const activity = this.summary()?.dailyActivity ?? [];
    const LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const d of activity) {
      const dow = new Date(d.date + 'T00:00:00').getDay();
      totals[dow] += d.habits;
    }
    const maxT = Math.max(1, ...totals);
    const ordered = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
      weekday: wd, total: totals[wd], label: LABELS[wd],
      heightPct: Math.round((totals[wd] / maxT) * 100), isBest: false,
    }));
    const bestIdx = ordered.reduce((bi, w, i, arr) => w.total > arr[bi].total ? i : bi, 0);
    if (ordered[bestIdx].total > 0) ordered[bestIdx].isBest = true;
    return ordered;
  });

  activityMix = computed(() => {
    const days = this.summary()?.dailyActivity ?? [];
    const total = days.length || 1;
    const taskDays  = days.filter((d) => d.tasks  > 0).length;
    const habitDays = days.filter((d) => d.habits > 0).length;
    const jrnlDays  = days.filter((d) => d.journal).length;
    return [
      { label: 'Tasks', days: taskDays,  total, pct: Math.round((taskDays  / total) * 100), color: '#818cf8', bg: 'rgba(99,102,241,0.12)',  icon: 'M20 6 9 17l-5-5' },
      { label: 'Routine', days: habitDays, total, pct: Math.round((habitDays / total) * 100), color: '#34d399', bg: 'rgba(16,185,129,0.12)', icon: 'M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5v5l3 2' },
      { label: 'Journal', days: jrnlDays,  total, pct: Math.round((jrnlDays  / total) * 100), color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  icon: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z' },
    ];
  });

  showDateLabels = computed(() => this.daysInRange() <= 30);

  ngOnInit() { this.load(); }

  setRange(r: AnalyticsRange) {
    if (this.range() === r) return;
    this.range.set(r);
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.analyticsService.getSummary(this.range()).subscribe({
      next: (s) => { this.summary.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  rangeLabel(r: AnalyticsRange): string {
    return r === '7d' ? '7d' : r === '30d' ? '30d' : r === '90d' ? '90d' : '1yr';
  }

  shortDay(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric' });
  }

  formatDelta(n: number): string {
    if (n === 0) return '±0';
    return n > 0 ? `+${n}` : `${n}`;
  }

  formatINR(amount: number): string {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
    return `₹${Math.round(amount)}`;
  }
}
