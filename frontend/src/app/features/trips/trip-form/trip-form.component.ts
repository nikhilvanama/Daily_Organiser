import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../trip.service';
import { Trip, TripChecklistItem, TripStatus, TRIP_COLUMNS } from '../../../core/models/trip.model';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SGD'] as const;

const PRESETS = {
  essentials: [
    { title: 'Flight / Train / Bus tickets', category: 'tickets' },
    { title: 'Hotel / Stay booking confirmation', category: 'stay' },
    { title: 'Government ID / Passport / Visa', category: 'tickets' },
    { title: 'Phone charger & Power bank', category: 'packing' },
    { title: 'Emergency cash & Cards', category: 'general' },
  ],
  packing: [
    { title: 'Clothes & weather-appropriate wear', category: 'packing' },
    { title: 'Toiletries & personal hygiene kit', category: 'packing' },
    { title: 'First-aid kit & personal medicines', category: 'packing' },
    { title: 'Sunscreen, sunglasses & umbrella', category: 'packing' },
    { title: 'Comfortable walking shoes', category: 'packing' },
  ],
  places: [
    { title: 'Must-visit spots & itinerary mapped', category: 'places' },
    { title: 'Monument / museum / activity passes booked', category: 'places' },
    { title: 'Saved restaurants & food spots', category: 'places' },
    { title: 'Offline maps downloaded on phone', category: 'places' },
  ],
};

@Component({
  selector: 'app-trip-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="trip-form">
      <div class="form-group">
        <label class="label">Trip title *</label>
        <input class="input" formControlName="title" placeholder="e.g. Japan in cherry-blossom season" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Destination</label>
          <input class="input" formControlName="destination" placeholder="City, country" />
        </div>
        <div class="form-group">
          <label class="label">Status</label>
          <select class="input" formControlName="status">
            @for (s of allStatuses; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Start date</label>
          <input class="input" type="date" formControlName="startDate" />
        </div>
        <div class="form-group">
          <label class="label">End date</label>
          <input class="input" type="date" formControlName="endDate" />
        </div>
      </div>

      @if (form.value.status === 'BOOKED' && !form.value.startDate) {
        <div class="hint warn">Set a start date — booking without dates won't show on your calendar.</div>
      }

      <div class="form-row">
        <div class="form-group">
          <label class="label">Travel companions</label>
          <input class="input" formControlName="companions" placeholder="Solo / With family / etc." />
        </div>
        <div class="form-group">
          <label class="label">Budget</label>
          <div class="combo">
            <input class="input" type="number" min="0" step="100" formControlName="budget" placeholder="0" />
            <select class="input narrow" formControlName="currency">
              @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">Notes, links & itinerary</label>
        <textarea class="input" formControlName="notes" rows="3" placeholder="Places to visit, notes, inspiration links, food recommendations..."></textarea>
      </div>

      <!-- Trip Preparation Checklist -->
      <div class="checklist-section">
        <div class="checklist-header">
          <div class="chk-title-group">
            <label class="label mb-0">Preparation & Packing Checklist</label>
            @if (checklist.length > 0) {
              <span class="chk-badge" [class.complete]="completedCount === checklist.length">
                {{ completedCount }}/{{ checklist.length }} done ({{ completionPercent }}%)
              </span>
            }
          </div>
          <span class="chk-subtext">Track tickets, bookings, stay, packing essentials, and places to see</span>
        </div>

        @if (checklist.length > 0) {
          <div class="chk-progress-bar">
            <div class="chk-progress-fill" [style.width.%]="completionPercent"></div>
          </div>
        }

        <!-- Quick Starter Preset Packs -->
        <div class="presets-row">
          <span class="presets-label">Quick templates:</span>
          <button type="button" class="preset-btn" (click)="applyPreset('essentials')">
            <span>🎫</span> Essentials Pack
          </button>
          <button type="button" class="preset-btn" (click)="applyPreset('packing')">
            <span>🎒</span> Packing List
          </button>
          <button type="button" class="preset-btn" (click)="applyPreset('places')">
            <span>📍</span> Itinerary & Spots
          </button>
        </div>

        <!-- Add Item Row -->
        <div class="chk-add-row">
          <select class="input chk-category-select" [(ngModel)]="selectedCategory" [ngModelOptions]="{standalone: true}">
            <option value="tickets">🎫 Tickets</option>
            <option value="stay">🏨 Stay</option>
            <option value="packing">🎒 Packing</option>
            <option value="places">📍 Places</option>
            <option value="general">📝 General</option>
          </select>
          <input
            class="input chk-add-input"
            type="text"
            [(ngModel)]="newItemTitle"
            [ngModelOptions]="{standalone: true}"
            (keydown.enter)="addChecklistItem($event)"
            placeholder="Add prep item (e.g. Flight tickets, Sunscreen)..."
          />
          <button type="button" class="btn-primary sm chk-add-btn" (click)="addChecklistItem()">
            + Add
          </button>
        </div>

        <!-- Checklist Items List -->
        @if (checklist.length > 0) {
          <div class="chk-items-list">
            @for (item of checklist; track item.id) {
              <div class="chk-item-row" [class.done]="item.completed">
                <label class="chk-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="item.completed"
                    (change)="toggleChecklistItem(item)"
                    class="chk-checkbox"
                  />
                </label>

                <span class="chk-cat-pill" [style.color]="getCategoryMeta(item.category).color" [style.background]="getCategoryMeta(item.category).bg">
                  {{ getCategoryMeta(item.category).icon }} {{ getCategoryMeta(item.category).label }}
                </span>

                <span class="chk-item-title" [class.completed]="item.completed">{{ item.title }}</span>

                <button type="button" class="icon-btn danger chk-remove-btn" (click)="removeChecklistItem(item.id)" title="Remove item">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="chk-empty-hint">
            No prep items yet. Click a quick template above or add your own items to track tickets, stay, and packing.
          </div>
        }
      </div>

      <div class="form-actions">
        @if (trip) {
          <button type="button" class="btn-ghost danger" (click)="deleted.emit()">Delete trip</button>
        }
        <div class="actions-right">
          <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
            {{ loading ? 'Saving…' : (trip ? 'Update' : 'Save trip') }}
          </button>
        </div>
      </div>
    </form>
  `,
  styles: [`
    .trip-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .combo { display: flex; gap: 4px; }
    .combo .narrow { width: 90px; flex-shrink: 0; }
    textarea.input { resize: vertical; min-height: 65px; }
    .form-actions { display: flex; gap: 0.75rem; align-items: center; padding-top: 0.5rem; }
    .actions-right { display: flex; gap: 0.75rem; margin-left: auto; }
    .btn-ghost.danger { color: #ef4444; }
    .btn-ghost.danger:hover { background: rgba(239, 68, 68, 0.1); }
    .hint { font-size: 0.78rem; color: var(--text-muted); padding: 6px 10px; border-radius: 6px; background: var(--bg-hover); }
    .hint.warn { color: #d97706; background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.25); }

    /* Preparation Checklist Styling */
    .checklist-section {
      display: flex; flex-direction: column; gap: 0.55rem;
      padding: 0.85rem; border-radius: 12px;
      background: var(--bg-secondary); border: 1px solid var(--border);
    }
    .checklist-header { display: flex; flex-direction: column; gap: 2px; }
    .chk-title-group { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .mb-0 { margin-bottom: 0; }
    .chk-subtext { font-size: 0.72rem; color: var(--text-muted); }
    .chk-badge {
      font-size: 0.7rem; font-weight: 600; padding: 2px 7px; border-radius: 5px;
      background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25);
    }
    .chk-badge.complete {
      background: rgba(16, 185, 129, 0.12); color: #10b981; border-color: rgba(16, 185, 129, 0.25);
    }
    .chk-progress-bar {
      width: 100%; height: 5px; border-radius: 99px; background: var(--border); overflow: hidden;
    }
    .chk-progress-fill {
      height: 100%; background: linear-gradient(90deg, #10b981, #34d399);
      transition: width 0.25s ease;
    }
    .presets-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 1px; }
    .presets-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 500; }
    .preset-btn {
      padding: 3px 8px; font-size: 0.72rem; font-weight: 500; border-radius: 6px;
      background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
      cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s; font-family: inherit;
    }
    .preset-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--accent); }
    .chk-add-row { display: flex; gap: 6px; align-items: center; margin-top: 2px; }
    .chk-category-select { width: 110px; flex-shrink: 0; font-size: 0.78rem; padding: 6px 8px; height: 34px; }
    .chk-add-input { flex: 1; font-size: 0.82rem; padding: 6px 10px; height: 34px; }
    .chk-add-btn { flex-shrink: 0; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; height: 34px; }
    .chk-items-list {
      display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; padding-right: 2px;
    }
    .chk-item-row {
      display: flex; align-items: center; gap: 8px; padding: 5px 8px;
      border-radius: 6px; background: var(--bg-card); border: 1px solid var(--border-light);
      transition: all 0.15s;
    }
    .chk-item-row:hover { border-color: var(--border); }
    .chk-item-row.done { opacity: 0.65; }
    .chk-checkbox-label { display: flex; align-items: center; cursor: pointer; margin: 0; }
    .chk-checkbox { cursor: pointer; width: 15px; height: 15px; accent-color: var(--accent); }
    .chk-cat-pill {
      font-size: 0.65rem; font-weight: 600; padding: 1px 6px; border-radius: 4px; flex-shrink: 0;
      display: inline-flex; align-items: center; gap: 2px;
    }
    .chk-item-title {
      flex: 1; font-size: 0.8rem; color: var(--text-primary); word-break: break-word; line-height: 1.3;
    }
    .chk-item-title.completed { text-decoration: line-through; color: var(--text-muted); }
    .chk-remove-btn { opacity: 0.6; }
    .chk-remove-btn:hover { opacity: 1; }
    .chk-empty-hint {
      font-size: 0.75rem; color: var(--text-muted); text-align: center;
      padding: 0.75rem 0.5rem; border: 1px dashed var(--border); border-radius: 8px;
    }

    .icon-btn { background: transparent; border: none; padding: 0.25rem; border-radius: 0.25rem; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn.danger:hover { color: #ef4444; background: var(--bg-secondary); }
    .sm { font-size: 0.8rem; padding: 0.375rem 0.75rem; }
    @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class TripFormComponent implements OnInit, OnChanges {
  @Input() trip: Trip | null = null;
  @Input() defaultStatus: TripStatus | null = null;
  @Output() saved = new EventEmitter<Trip>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private tripService = inject(TripService);

  loading = false;
  allStatuses = TRIP_COLUMNS;
  currencies = CURRENCIES;

  checklist: TripChecklistItem[] = [];
  newItemTitle = '';
  selectedCategory = 'tickets';

  readonly categoryMeta: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    tickets: { label: 'Tickets', icon: '🎫', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
    stay:    { label: 'Stay',    icon: '🏨', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
    packing: { label: 'Packing', icon: '🎒', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    places:  { label: 'Places',  icon: '📍', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
    general: { label: 'General', icon: '📝', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
  };

  form = this.fb.group({
    title: ['', Validators.required],
    destination: [''],
    status: ['BUCKET' as TripStatus],
    startDate: [''],
    endDate: [''],
    companions: [''],
    budget: [null as number | null],
    currency: ['INR'],
    notes: [''],
  });

  get completedCount(): number {
    return this.checklist.filter((i) => i.completed).length;
  }

  get completionPercent(): number {
    if (this.checklist.length === 0) return 0;
    return Math.round((this.completedCount / this.checklist.length) * 100);
  }

  getCategoryMeta(cat?: string) {
    return this.categoryMeta[cat || 'general'] || this.categoryMeta['general'];
  }

  ngOnInit() { this.fillForm(); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['trip'] || changes['defaultStatus']) this.fillForm();
  }

  private fillForm() {
    if (!this.trip) {
      this.checklist = [];
      this.newItemTitle = '';
      this.form.reset({
        title: '', destination: '',
        status: this.defaultStatus ?? 'BUCKET',
        startDate: '', endDate: '', companions: '',
        budget: null, currency: 'INR', notes: '',
      });
      return;
    }
    this.checklist = this.trip.checklist ? this.trip.checklist.map((c) => ({ ...c })) : [];
    this.form.patchValue({
      title: this.trip.title,
      destination: this.trip.destination ?? '',
      status: this.trip.status === 'CANCELLED' ? 'CANCELLED' as TripStatus : this.trip.status,
      startDate: this.trip.startDate ?? '',
      endDate: this.trip.endDate ?? '',
      companions: this.trip.companions ?? '',
      budget: this.trip.budget,
      currency: this.trip.currency,
      notes: this.trip.notes ?? '',
    });
  }

  addChecklistItem(ev?: Event) {
    if (ev) ev.preventDefault();
    const title = this.newItemTitle.trim();
    if (!title) return;
    this.checklist.push({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      completed: false,
      category: this.selectedCategory,
    });
    this.newItemTitle = '';
  }

  toggleChecklistItem(item: TripChecklistItem) {
    item.completed = !item.completed;
  }

  removeChecklistItem(id: string) {
    this.checklist = this.checklist.filter((i) => i.id !== id);
  }

  applyPreset(type: 'essentials' | 'packing' | 'places') {
    const list = PRESETS[type];
    if (!list) return;
    const toAdd = list.filter(
      (p) => !this.checklist.some((existing) => existing.title.toLowerCase() === p.title.toLowerCase())
    );
    for (const item of toAdd) {
      this.checklist.push({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: item.title,
        completed: false,
        category: item.category,
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const raw = this.form.value;
    const isEdit = !!this.trip;
    const blankOrNull = (v: string | null | undefined) => {
      const trimmed = (v ?? '').trim();
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    const dto: any = {
      title: raw.title!,
      destination: blankOrNull(raw.destination),
      status: raw.status ?? 'BUCKET',
      startDate: raw.startDate ? raw.startDate : (isEdit ? null : undefined),
      endDate: raw.endDate ? raw.endDate : (isEdit ? null : undefined),
      companions: blankOrNull(raw.companions),
      budget: raw.budget ?? (isEdit ? null : undefined),
      currency: raw.currency || 'INR',
      notes: blankOrNull(raw.notes),
      checklist: this.checklist,
    };
    const op$ = this.trip
      ? this.tripService.update(this.trip.id, dto)
      : this.tripService.create(dto);
    op$.subscribe({
      next: (t) => { this.loading = false; this.saved.emit(t); },
      error: () => { this.loading = false; },
    });
  }
}
