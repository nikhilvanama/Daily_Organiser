import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { JournalService } from '../journal.service';
import { JournalEntry, MOOD_CHOICES } from '../../../core/models/journal.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-journal-page',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <div class="page animate-in">
      <div class="page-header">
        <div>
          <h2>Journal</h2>
          <p>Reflect on your day — one entry per day, private to you</p>
        </div>
      </div>

      <!-- Active entry card: today by default; arrows navigate to past dates -->
      <div class="card entry-card">
        <div class="entry-header">
          <div class="entry-title-block">
            <h3>{{ isToday() ? "Today's Reflection" : selectedLabel() + ' · Reflection' }}</h3>
            <span class="entry-sub">
              @if (isToday()) {
                {{ todayLong() }}
                @if (streak() > 0) { · 🔥 {{ streak() }}-day streak }
              } @else if (daysAgo() === 1) {
                Yesterday
              } @else {
                {{ daysAgo() }} days ago
              }
            </span>
          </div>
          <div class="entry-nav">
            <button class="nav-btn" (click)="shiftDate(-1)" [disabled]="!canShiftBack()" title="Previous day">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="nav-btn" (click)="shiftDate(1)" [disabled]="!canShiftForward()" title="Next day">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            @if (!isToday()) {
              <button class="btn-ghost sm jump-today" (click)="goToToday()">Today</button>
            }
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="mood-row">
            <span class="mood-label">Mood</span>
            @for (m of moods; track m) {
              <button type="button" class="mood-chip" [class.active]="form.value.mood === m" (click)="toggleMood(m)">{{ m }}</button>
            }
          </div>

          <div class="form-group">
            <input class="input title-input" formControlName="title" placeholder="Optional title" maxlength="120" />
          </div>

          <div class="form-group">
            <textarea class="input body-input" formControlName="body" rows="10" placeholder="What did you do today? How did it feel?"></textarea>
            <div class="word-row">
              <span class="word-count">{{ wordCount() }} word{{ wordCount() === 1 ? '' : 's' }}</span>
              @if (savedRecently()) { <span class="saved-pill">✓ Saved</span> }
            </div>
          </div>

          <div class="entry-actions">
            @if (existingEntry()) {
              <button type="button" class="btn-ghost danger" (click)="askDelete()">Delete</button>
            }
            <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : (existingEntry() ? 'Update' : 'Save Entry') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Past entries list -->
      @if (pastEntries().length > 0) {
        <div class="card past-card">
          <div class="other-header"><h3>Previous Entries</h3></div>
          <div class="past-list">
            @for (e of pastEntries(); track e.id) {
              <button class="past-row" (click)="selectDate(e.date)">
                <div class="past-date-block">
                  <span class="past-date">{{ shortLabel(e.date) }}</span>
                  <span class="past-day">{{ relativeLabel(e.date) }}</span>
                </div>
                <div class="past-mood">{{ e.mood ?? '·' }}</div>
                <div class="past-body">
                  @if (e.title) { <div class="past-title">{{ e.title }}</div> }
                  <div class="past-preview">{{ preview(e.body) }}</div>
                </div>
              </button>
            }
          </div>
        </div>
      } @else if (!loading()) {
        <div class="card empty-card">
          <p>No past entries yet. Today's reflection will become the first one.</p>
        </div>
      }
    </div>

    <app-confirm-dialog
      [isOpen]="showDelete"
      title="Delete entry"
      [message]="'Delete your reflection for ' + selectedLabel() + '? This cannot be undone.'"
      confirmText="Delete"
      (confirmed)="confirmDelete()"
      (cancelled)="showDelete = false" />
  `,
  styles: [`
    .entry-card { padding: 1rem 1.25rem 1.25rem; }
    .entry-header {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding-bottom: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border);
    }
    .entry-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .entry-title-block h3 { font-size: 1rem; font-weight: 600; margin: 0; }
    .entry-sub { font-size: 0.72rem; color: var(--text-muted); }

    .entry-nav { display: flex; align-items: center; gap: 6px; }
    .nav-btn {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary); cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: all 0.15s; padding: 0;
    }
    .nav-btn:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); border-color: var(--text-muted); }
    .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .jump-today { padding: 5px 10px; font-size: 0.75rem; }

    .mood-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .mood-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-right: 4px; }
    .mood-chip {
      width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--border);
      background: transparent; cursor: pointer; font-size: 1.1rem; line-height: 1;
      transition: all 0.15s; padding: 0;
    }
    .mood-chip:hover { border-color: var(--text-muted); }
    .mood-chip.active { border-color: var(--accent); background: var(--bg-hover); transform: scale(1.1); }

    .form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 0.75rem; }
    .title-input { font-size: 1rem; font-weight: 600; }
    .body-input { font-size: 0.92rem; line-height: 1.55; resize: vertical; min-height: 200px; font-family: inherit; }

    .word-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted); padding: 0 2px; }
    .saved-pill { color: var(--accent); font-weight: 600; }

    .entry-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 0.5rem; }
    .btn-ghost.danger { color: #ef4444; }
    .btn-ghost.danger:hover { background: rgba(239, 68, 68, 0.1); }

    .past-card { overflow: hidden; }
    .other-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
    .other-header h3 { font-size: 0.95rem; font-weight: 600; margin: 0; }
    .past-list { padding: 0.4rem; }
    .past-row {
      display: flex; align-items: stretch; gap: 12px; padding: 10px 12px; width: 100%;
      background: transparent; border: 1px solid transparent; border-radius: 8px; text-align: left;
      cursor: pointer; transition: all 0.15s; font-family: inherit; color: inherit;
    }
    .past-row:hover { background: var(--bg-hover); border-color: var(--border); }
    .past-date-block { display: flex; flex-direction: column; min-width: 75px; gap: 1px; flex-shrink: 0; }
    .past-date { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }
    .past-day { font-size: 0.7rem; color: var(--text-muted); }
    .past-mood { font-size: 1.1rem; align-self: center; min-width: 22px; text-align: center; color: var(--text-muted); }
    .past-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .past-title { font-size: 0.86rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .past-preview { font-size: 0.78rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .empty-card { padding: 2rem 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

    @media (max-width: 640px) {
      .entry-header { flex-direction: column; align-items: stretch; gap: 0.75rem; }
      .entry-nav { justify-content: space-between; }
      .past-row { flex-wrap: wrap; }
    }
  `],
})
export class JournalPageComponent implements OnInit, OnDestroy {
  private journalService = inject(JournalService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private sub: Subscription | null = null;
  private savedTimeout: ReturnType<typeof setTimeout> | null = null;

  moods = MOOD_CHOICES;

  selectedDate = signal(this.journalService.localTodayKey());
  entries = signal<JournalEntry[]>([]);
  saving = signal(false);
  savedRecently = signal(false);
  loading = signal(true);

  showDelete = false;

  form = this.fb.group({
    title: [''],
    body: ['', Validators.required],
    mood: [''],
  });

  // The entry currently in cache for the selected date, if any (otherwise null = unwritten day).
  existingEntry = computed<JournalEntry | null>(() => {
    return this.entries().find((e) => e.date === this.selectedDate()) ?? null;
  });

  pastEntries = computed(() => this.entries().filter((e) => e.date !== this.selectedDate()));

  isToday = computed(() => this.selectedDate() === this.journalService.localTodayKey());

  daysAgo = computed(() => {
    const today = new Date(this.journalService.localTodayKey() + 'T00:00:00').getTime();
    const sel = new Date(this.selectedDate() + 'T00:00:00').getTime();
    return Math.round((today - sel) / 86400000);
  });

  selectedLabel = computed(() => {
    const d = new Date(this.selectedDate() + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  });

  todayLong = computed(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  });

  wordCount = computed(() => {
    const body = (this.form.value.body ?? '').trim();
    return body.length === 0 ? 0 : body.split(/\s+/).length;
  });

  // Current streak = consecutive days (walking back from today) that have an entry.
  streak = computed(() => {
    const dates = new Set(this.entries().map((e) => e.date));
    let count = 0;
    const cursor = new Date(this.journalService.localTodayKey() + 'T00:00:00');
    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (dates.has(key)) {
        count++;
      } else if (count > 0 || key !== this.journalService.localTodayKey()) {
        break;
      } else {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
      if (count > 365) break;
    }
    return count;
  });

  ngOnInit() {
    // Track word count by listening to body changes; signal proxies via the form
    this.form.valueChanges.subscribe(() => this.wordCount());

    this.sub = this.journalService.entries$.subscribe((list) => {
      this.entries.set(list);
      this.fillFormFromCache();
    });
    this.journalService.loadAll().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.savedTimeout) clearTimeout(this.savedTimeout);
  }

  // --- Date navigation ---

  canShiftBack() {
    return this.daysAgo() < 365; // arbitrary cap
  }
  canShiftForward() { return !this.isToday(); }

  shiftDate(delta: number) {
    const d = new Date(this.selectedDate() + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (next > this.journalService.localTodayKey()) return;
    this.selectedDate.set(next);
    this.fillFormFromCache();
  }

  goToToday() {
    this.selectedDate.set(this.journalService.localTodayKey());
    this.fillFormFromCache();
  }

  selectDate(date: string) {
    this.selectedDate.set(date);
    this.fillFormFromCache();
  }

  // --- Form helpers ---

  toggleMood(m: string) {
    const current = this.form.value.mood ?? '';
    this.form.patchValue({ mood: current === m ? '' : m });
  }

  private fillFormFromCache() {
    const entry = this.existingEntry();
    if (entry) {
      this.form.reset({
        title: entry.title ?? '',
        body: entry.body,
        mood: entry.mood ?? '',
      });
    } else {
      this.form.reset({ title: '', body: '', mood: '' });
    }
    this.savedRecently.set(false);
  }

  save() {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const dto = {
      title: raw.title?.trim() || undefined,
      body: raw.body!.trim(),
      mood: raw.mood || undefined,
    };
    this.saving.set(true);
    this.journalService.upsert(this.selectedDate(), dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedRecently.set(true);
        this.toast.success(this.existingEntry() ? 'Entry updated' : 'Entry saved');
        if (this.savedTimeout) clearTimeout(this.savedTimeout);
        this.savedTimeout = setTimeout(() => this.savedRecently.set(false), 2500);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not save entry');
      },
    });
  }

  askDelete() { this.showDelete = true; }

  confirmDelete() {
    this.journalService.remove(this.selectedDate()).subscribe({
      next: () => {
        this.toast.success('Entry deleted');
        this.fillFormFromCache();
      },
    });
    this.showDelete = false;
  }

  // --- Past entry rendering helpers ---

  shortLabel(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  relativeLabel(date: string): string {
    const today = new Date(this.journalService.localTodayKey() + 'T00:00:00').getTime();
    const target = new Date(date + 'T00:00:00').getTime();
    const days = Math.round((today - target) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
  }

  preview(body: string): string {
    const t = body.trim().replace(/\s+/g, ' ');
    return t.length > 180 ? t.slice(0, 180) + '…' : t;
  }
}
