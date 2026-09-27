import { Component, ElementRef, Injectable, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskService } from '../../../features/tasks/task.service';
import { GoalService } from '../../../features/goals/goal.service';
import { TripService } from '../../../features/trips/trip.service';
import { BuyListService } from '../../../features/buy-list/buy-list.service';
import { ProjectService } from '../../../features/projects/project.service';
import { JournalService } from '../../../features/journal/journal.service';
import { slugify } from '../../../core/utils/slugify';

// Tiny shared state so the topbar button and the Ctrl+K shortcut (in the layout)
// can both open the same overlay without wiring inputs through the tree.
@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  isOpen = signal(false);
  open() { this.isOpen.set(true); }
  close() { this.isOpen.set(false); }
}

interface SearchHit {
  label: string;
  sub: string;
  route: string[];
  queryParams?: Record<string, string>;
}

interface SearchGroup {
  module: string;
  icon: string;
  hits: SearchHit[];
}

// Global search overlay (Ctrl+K): searches the cached data of every module —
// plans, goals, trips, buy list, projects, journal — and jumps to the match.
@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [],
  template: `
    @if (search.isOpen()) {
      <div class="gs-backdrop" (click)="search.close()"></div>
      <div class="gs-panel" role="dialog" aria-label="Global search">
        <div class="gs-input-row">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input #inp class="gs-input" type="text" placeholder="Search plans, goals, trips, projects, journal…"
                 [value]="query()" (input)="query.set($any($event.target).value)"
                 (keydown.escape)="search.close()" (keydown.enter)="openFirst()" />
          <span class="gs-esc">esc</span>
        </div>

        @if (query().trim().length < 2) {
          <div class="gs-hint">Type at least 2 characters… <kbd>Enter</kbd> opens the first match.</div>
        } @else if (groups().length === 0) {
          <div class="gs-hint">No matches for "{{ query() }}".</div>
        } @else {
          <div class="gs-results">
            @for (g of groups(); track g.module) {
              <div class="gs-group">
                <span class="gs-group-title">{{ g.icon }} {{ g.module }}</span>
                @for (h of g.hits; track h.label + h.sub) {
                  <button class="gs-hit" (click)="go(h)">
                    <span class="gs-hit-label">{{ h.label }}</span>
                    @if (h.sub) { <span class="gs-hit-sub">{{ h.sub }}</span> }
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .gs-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 990; backdrop-filter: blur(2px); }
    .gs-panel {
      position: fixed; top: 12vh; left: 50%; transform: translateX(-50%);
      width: min(600px, calc(100vw - 2rem)); max-height: 65vh; z-index: 991;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
      box-shadow: 0 24px 70px rgba(0,0,0,0.45); display: flex; flex-direction: column; overflow: hidden;
    }
    .gs-input-row { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border); color: var(--text-muted); }
    .gs-input { flex: 1; border: none; background: transparent; outline: none; font-family: inherit; font-size: 0.95rem; color: var(--text-primary); }
    .gs-input::placeholder { color: var(--text-muted); }
    .gs-esc { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; }
    .gs-hint { padding: 1.25rem 16px; font-size: 0.82rem; color: var(--text-muted); }
    .gs-hint kbd { border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-size: 0.7rem; }
    .gs-results { overflow-y: auto; padding: 8px; scrollbar-width: thin; }
    .gs-group { display: flex; flex-direction: column; margin-bottom: 6px; }
    .gs-group-title { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); padding: 8px 10px 4px; }
    .gs-hit {
      display: flex; align-items: baseline; gap: 8px; width: 100%; text-align: left;
      padding: 8px 10px; border: none; border-radius: 8px; background: transparent;
      cursor: pointer; font-family: inherit; transition: background 0.1s;
    }
    .gs-hit:hover { background: var(--bg-hover); }
    .gs-hit-label { font-size: 0.87rem; font-weight: 500; color: var(--text-primary); }
    .gs-hit-sub { font-size: 0.72rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `],
})
export class GlobalSearchComponent {
  search = inject(GlobalSearchService);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  private tripService = inject(TripService);
  private buyService = inject(BuyListService);
  private projectService = inject(ProjectService);
  private journalService = inject(JournalService);

  @ViewChild('inp') inp?: ElementRef<HTMLInputElement>;

  query = signal('');

  private tasks = toSignal(this.taskService.tasks$, { initialValue: [] });
  private goals = toSignal(this.goalService.goals$, { initialValue: [] });
  private trips = toSignal(this.tripService.trips$, { initialValue: [] });
  private buyItems = toSignal(this.buyService.items$, { initialValue: [] });
  private projects = toSignal(this.projectService.projects$, { initialValue: [] });
  private journal = toSignal(this.journalService.entries$, { initialValue: [] });

  constructor() {
    // On open: refresh every module's cache once and focus the input.
    effect(() => {
      if (this.search.isOpen()) {
        this.query.set('');
        this.taskService.loadAll().subscribe({ error: () => {} });
        this.goalService.loadAll().subscribe({ error: () => {} });
        this.tripService.loadAll().subscribe({ error: () => {} });
        this.buyService.loadAll().subscribe({ error: () => {} });
        this.projectService.loadAll().subscribe({ error: () => {} });
        this.journalService.loadAll().subscribe({ error: () => {} });
        setTimeout(() => this.inp?.nativeElement.focus(), 0);
      }
    });
  }

  groups = computed<SearchGroup[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];
    const has = (...fields: (string | null | undefined)[]) =>
      fields.some((f) => (f ?? '').toLowerCase().includes(q));
    const cap = <T,>(arr: T[]) => arr.slice(0, 5);

    const groups: SearchGroup[] = [
      {
        module: 'My Plans', icon: '📋',
        hits: cap(this.tasks().filter((t) => has(t.title, t.description, t.location)))
          .map((t) => ({ label: t.title, sub: t.dueDate ?? t.type, route: ['/tasks', slugify(t.title)] })),
      },
      {
        module: 'Goals', icon: '🎯',
        hits: cap(this.goals().filter((g) => has(g.title, g.description)))
          .map((g) => ({ label: g.title, sub: `${Math.round(g.progress)}% · ${g.status}`, route: ['/goals', slugify(g.title)] })),
      },
      {
        module: 'Trips', icon: '✈️',
        hits: cap(this.trips().filter((t) => has(t.title, t.destination, t.notes)))
          .map((t) => ({ label: t.title, sub: t.destination ?? t.status, route: ['/trips'] })),
      },
      {
        module: 'Buy List', icon: '🛒',
        hits: cap(this.buyItems().filter((b) => has(b.name, b.notes, b.store)))
          .map((b) => ({ label: b.name, sub: b.status, route: ['/buy-list'] })),
      },
      {
        module: 'Projects', icon: '💼',
        hits: cap(this.projects().filter((p) => has(p.title, p.clientName, p.description)))
          .map((p) => ({ label: p.title, sub: p.clientName ?? p.status, route: ['/projects', slugify(p.title)] })),
      },
      {
        module: 'Journal', icon: '📓',
        hits: cap(this.journal().filter((e) => has(e.title, e.body)))
          .map((e) => ({ label: e.title || e.date, sub: e.date, route: ['/journal'], queryParams: { date: e.date } })),
      },
    ];
    return groups.filter((g) => g.hits.length > 0);
  });

  go(h: SearchHit) {
    this.search.close();
    this.router.navigate(h.route, { queryParams: h.queryParams });
  }

  openFirst() {
    const first = this.groups()[0]?.hits[0];
    if (first) this.go(first);
  }
}
