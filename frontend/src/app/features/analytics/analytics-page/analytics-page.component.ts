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
      <div class="page-header">
        <div>
          <h2>Analytics</h2>
          <p>How you spent your time and energy</p>
        </div>
        <div class="range-pills">
          @for (r of ranges; track r) {
            <button class="range-pill" [class.active]="range() === r" (click)="setRange(r)">{{ rangeLabel(r) }}</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="card loading-card">Crunching the numbers…</div>
      } @else if (summary()) {
        <!-- Top stat cards -->
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-num">{{ summary()!.tasks.completed }}</span>
            <span class="stat-label">Tasks completed</span>
            <span class="delta" [class.up]="summary()!.tasks.delta > 0" [class.down]="summary()!.tasks.delta < 0">
              {{ formatDelta(summary()!.tasks.delta) }} vs previous
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ summary()!.habits.consistencyPct | number:'1.0-0' }}<small>%</small></span>
            <span class="stat-label">Habit consistency</span>
            <span class="muted">{{ summary()!.habits.activeHabits }} active habit{{ summary()!.habits.activeHabits === 1 ? '' : 's' }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ formatMinutes(summary()!.focus.minutes) }}</span>
            <span class="stat-label">Focused time</span>
            <span class="delta" [class.up]="summary()!.focus.delta > 0" [class.down]="summary()!.focus.delta < 0">
              {{ summary()!.focus.sessions }} sessions
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ summary()!.journal.entries }}</span>
            <span class="stat-label">Journal entries</span>
            <span class="muted">{{ summary()!.journal.ratio * 100 | number:'1.0-0' }}% of days</span>
          </div>
        </div>

        <!-- Insights -->
        @if (summary()!.insights.length > 0) {
          <div class="card insights-card">
            <h3>Insights</h3>
            <ul class="insights-list">
              @for (i of summary()!.insights; track i) {
                <li>💡 {{ i }}</li>
              }
            </ul>
          </div>
        }

        <!-- Daily activity chart -->
        <div class="card chart-card">
          <h3>Daily activity</h3>
          <p class="muted">Tasks done + minutes focused, last {{ daysInRange() }} days</p>
          <div class="bar-chart" [style.--bar-count]="summary()!.dailyActivity.length">
            @for (d of summary()!.dailyActivity; track d.date) {
              <div class="bar-col" [title]="d.date + ' · ' + d.tasks + ' tasks · ' + d.focusMinutes + 'm focus'">
                <div class="bar-stack">
                  @if (focusMax() > 0) {
                    <div class="bar focus" [style.height.%]="(d.focusMinutes / focusMax()) * 100"></div>
                  }
                  @if (tasksMax() > 0) {
                    <div class="bar tasks" [style.height.%]="(d.tasks / tasksMax()) * 100"></div>
                  }
                  @if (d.journal) { <div class="journal-dot" title="Journal entry written"></div> }
                </div>
                @if (showDayLabels()) {
                  <span class="bar-label">{{ shortDay(d.date) }}</span>
                }
              </div>
            }
          </div>
          <div class="legend">
            <span class="legend-item"><span class="swatch focus"></span> Focus minutes</span>
            <span class="legend-item"><span class="swatch tasks"></span> Tasks done</span>
            <span class="legend-item"><span class="swatch journal"></span> Journal</span>
          </div>
        </div>

        <!-- By weekday + Best streak + Top categories -->
        <div class="grid-row">
          <div class="card weekday-card">
            <h3>By weekday</h3>
            <p class="muted">Where your productivity lives</p>
            <div class="weekday-chart">
              @for (w of summary()!.byWeekday; track w.weekday) {
                <div class="wd-col">
                  <div class="wd-bar-wrap">
                    <div class="wd-bar"
                      [style.height.%]="(w.focusMinutes / Math.max(maxWeekdayMinutes(), 1)) * 100"
                      [title]="weekdayLabel(w.weekday) + ': ' + w.tasks + ' tasks · ' + w.focusMinutes + 'm focus'"></div>
                  </div>
                  <span class="wd-label">{{ weekdayLabel(w.weekday).slice(0, 3) }}</span>
                  <span class="wd-meta">{{ w.tasks }}t</span>
                </div>
              }
            </div>
          </div>

          <div class="card streak-card">
            <h3>Best streak</h3>
            @if (summary()!.habits.bestStreak > 0) {
              <div class="streak-big">
                <span class="streak-num">🔥 {{ summary()!.habits.bestStreak }}</span>
                <span class="streak-label">consecutive days</span>
              </div>
              @if (summary()!.habits.bestStreakHabit) {
                <p class="streak-hab">{{ summary()!.habits.bestStreakHabit }}</p>
              }
            } @else {
              <p class="muted">No active streaks yet.</p>
            }
            <hr />
            <h3>Freelance</h3>
            <div class="kv-row"><span class="muted">Projects completed</span> <strong>{{ summary()!.projects.completed }}</strong></div>
            <div class="kv-row"><span class="muted">Payments received</span> <strong>{{ summary()!.projects.payments }}</strong></div>
            <div class="kv-row"><span class="muted">Revenue</span> <strong>₹{{ summary()!.projects.revenue | number:'1.0-0' }}</strong></div>
          </div>

          <div class="card cat-card">
            <h3>Top categories</h3>
            @if (summary()!.topCategories.length === 0) {
              <p class="muted">No categorized tasks completed in this range.</p>
            } @else {
              <ul class="cat-list">
                @for (c of summary()!.topCategories; track c.name) {
                  <li class="cat-row">
                    <span class="cat-dot" [style.background]="c.color"></span>
                    <span class="cat-name">{{ c.name }}</span>
                    <span class="cat-bar"><span class="cat-fill" [style.background]="c.color" [style.width.%]="(c.count / summary()!.topCategories[0].count) * 100"></span></span>
                    <span class="cat-count">{{ c.count }}</span>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      } @else {
        <div class="card empty-card">
          <p>No data yet. Complete some tasks, check off habits, or start a focus session.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Math is exposed on the component so it can be used inside templates */
    .page-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .range-pills { display: flex; gap: 4px; padding: 3px; background: var(--bg-secondary); border-radius: 8px; }
    .range-pill { background: transparent; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .range-pill:hover { color: var(--text-primary); }
    .range-pill.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 2px rgba(0,0,0,0.08); }

    .loading-card, .empty-card { padding: 3rem; text-align: center; color: var(--text-muted); }

    /* Top stat cards */
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 4px; }
    .stat-num { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .stat-num small { font-size: 1rem; color: var(--text-muted); margin-left: 1px; }
    .stat-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
    .delta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .delta.up { color: var(--accent); }
    .delta.down { color: #ef4444; }
    .muted { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

    /* Insights */
    .insights-card { padding: 1.25rem 1.5rem; }
    .insights-card h3 { font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem; }
    .insights-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .insights-list li { font-size: 0.88rem; color: var(--text-primary); padding: 8px 10px; background: var(--bg-hover); border-radius: 6px; }

    /* Daily activity chart */
    .chart-card { padding: 1.25rem 1.5rem; }
    .chart-card h3 { font-size: 1rem; font-weight: 600; margin: 0; }
    .chart-card .muted { margin-bottom: 0.75rem; }
    .bar-chart { display: grid; grid-template-columns: repeat(var(--bar-count, 30), 1fr); gap: 2px; align-items: end; height: 140px; padding: 0 4px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
    .bar-stack { width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch; gap: 1px; position: relative; }
    .bar { width: 100%; border-radius: 2px 2px 0 0; }
    .bar.focus { background: var(--accent); opacity: 0.85; }
    .bar.tasks { background: #6366f1; opacity: 0.85; }
    .bar-label { font-size: 0.6rem; color: var(--text-muted); }
    .journal-dot { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; }
    .legend { display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
    .swatch.focus { background: var(--accent); }
    .swatch.tasks { background: #6366f1; }
    .swatch.journal { background: #f59e0b; border-radius: 50%; }

    /* Bottom row */
    .grid-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }
    .grid-row .card { padding: 1.25rem 1.5rem; }
    .grid-row h3 { font-size: 1rem; font-weight: 600; margin: 0; }
    .grid-row .muted { margin: 4px 0 0.75rem; }
    hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }

    /* Weekday chart */
    .weekday-chart { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 140px; }
    .wd-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .wd-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .wd-bar { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; opacity: 0.85; transition: height 0.4s; }
    .wd-label { font-size: 0.72rem; color: var(--text-secondary); font-weight: 600; }
    .wd-meta { font-size: 0.65rem; color: var(--text-muted); }

    /* Streak + freelance card */
    .streak-big { display: flex; flex-direction: column; gap: 2px; padding: 0.5rem 0; }
    .streak-num { font-size: 1.75rem; font-weight: 700; color: #f97316; line-height: 1; }
    .streak-label { font-size: 0.75rem; color: var(--text-muted); }
    .streak-hab { font-size: 0.88rem; color: var(--text-primary); margin: 0.25rem 0 0; }
    .kv-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.85rem; padding: 4px 0; }
    .kv-row strong { color: var(--text-primary); font-weight: 600; }

    /* Top categories */
    .cat-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .cat-row { display: grid; grid-template-columns: 14px 1fr 1fr auto; align-items: center; gap: 8px; font-size: 0.85rem; }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; }
    .cat-name { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cat-bar { height: 6px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden; }
    .cat-fill { display: block; height: 100%; border-radius: 99px; transition: width 0.4s; }
    .cat-count { font-weight: 600; color: var(--text-primary); }

    @media (max-width: 900px) {
      .stat-grid { grid-template-columns: 1fr 1fr; }
      .grid-row { grid-template-columns: 1fr; }
    }
  `],
})
export class AnalyticsPageComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  ranges: AnalyticsRange[] = ['7d', '30d', '90d', '365d'];
  range = signal<AnalyticsRange>('30d');
  summary = signal<AnalyticsSummary | null>(null);
  loading = signal<boolean>(true);

  // Expose Math to the template so we can clamp at 1.
  Math = Math;

  daysInRange = computed(() => {
    const r = this.range();
    return r === '7d' ? 7 : r === '30d' ? 30 : r === '90d' ? 90 : 365;
  });

  focusMax = computed(() => Math.max(1, ...(this.summary()?.dailyActivity ?? []).map((d) => d.focusMinutes)));
  tasksMax = computed(() => Math.max(1, ...(this.summary()?.dailyActivity ?? []).map((d) => d.tasks)));
  maxWeekdayMinutes = computed(() => Math.max(...(this.summary()?.byWeekday ?? []).map((w) => w.focusMinutes), 1));
  showDayLabels = computed(() => this.daysInRange() <= 30);

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
    return r === '7d' ? '7d' : r === '30d' ? '30d' : r === '90d' ? '90d' : '1y';
  }

  weekdayLabel(wd: number): string {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wd];
  }

  shortDay(date: string): string {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString(undefined, { day: 'numeric' });
  }

  formatDelta(n: number): string {
    if (n === 0) return '±0';
    return n > 0 ? `+${n}` : `${n}`;
  }

  formatMinutes(min: number): string {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
}
