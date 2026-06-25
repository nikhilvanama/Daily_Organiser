import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../trip.service';
import { Trip, TripStatus, TRIP_COLUMNS } from '../../../core/models/trip.model';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SGD'] as const;

@Component({
  selector: 'app-trip-form',
  standalone: true,
  imports: [ReactiveFormsModule],
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
        <label class="label">Notes / itinerary</label>
        <textarea class="input" formControlName="notes" rows="3" placeholder="Places to visit, things to pack, food to try..."></textarea>
      </div>

      <div class="form-group">
        <label class="label">Inspiration links (reels, blogs, photos)</label>
        <div class="links-list">
          @for (link of references; track $index) {
            <div class="link-row">
              <input class="input link-input" [value]="link" (input)="updateLink($index, $event)" placeholder="https://..." />
              <button type="button" class="icon-btn danger" (click)="removeLink($index)">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          }
        </div>
        <button type="button" class="btn-ghost sm" (click)="addLink()">+ Add link</button>
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
    textarea.input { resize: vertical; min-height: 70px; }
    .form-actions { display: flex; gap: 0.75rem; align-items: center; padding-top: 0.5rem; }
    .actions-right { display: flex; gap: 0.75rem; margin-left: auto; }
    .btn-ghost.danger { color: #ef4444; }
    .btn-ghost.danger:hover { background: rgba(239, 68, 68, 0.1); }
    .hint { font-size: 0.78rem; color: var(--text-muted); padding: 6px 10px; border-radius: 6px; background: var(--bg-hover); }
    .hint.warn { color: #d97706; background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.25); }
    .links-list { display: flex; flex-direction: column; gap: 0.375rem; }
    .link-row { display: flex; gap: 0.375rem; align-items: center; }
    .link-input { flex: 1; font-size: 0.82rem; }
    .icon-btn { background: transparent; border: none; padding: 0.25rem; border-radius: 0.25rem; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn.danger:hover { color: #ef4444; background: var(--bg-secondary); }
    .sm { font-size: 0.8rem; padding: 0.375rem 0.75rem; }
    @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class TripFormComponent implements OnInit, OnChanges {
  @Input() trip: Trip | null = null;
  @Input() defaultStatus: TripStatus | null = null; // pre-select column when adding from a specific lane
  @Output() saved = new EventEmitter<Trip>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private tripService = inject(TripService);

  loading = false;
  allStatuses = TRIP_COLUMNS;
  currencies = CURRENCIES;
  references: string[] = [''];

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

  ngOnInit() { this.fillForm(); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['trip'] || changes['defaultStatus']) this.fillForm();
  }

  private fillForm() {
    if (!this.trip) {
      this.references = [''];
      this.form.reset({
        title: '', destination: '',
        status: this.defaultStatus ?? 'BUCKET',
        startDate: '', endDate: '', companions: '',
        budget: null, currency: 'INR', notes: '',
      });
      return;
    }
    this.references = this.trip.references.length > 0 ? [...this.trip.references] : [''];
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

  addLink() { this.references = [...this.references, '']; }
  removeLink(i: number) { this.references = this.references.filter((_, idx) => idx !== i); }
  updateLink(i: number, ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.references = this.references.map((l, idx) => (idx === i ? v : l));
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const raw = this.form.value;
    // For optional fields, send `null` (not `undefined`) when the user clears them.
    // JSON drops undefined properties from the body, which means the backend never sees
    // "this field was cleared" and the old value sticks. null is treated as "delete
    // this field" by Firebase RTDB on update, which is exactly what we want.
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
      references: this.references.map((l) => l.trim()).filter(Boolean),
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
