import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BuyListService } from '../buy-list.service';
import { BUY_COLUMNS, BuyItem, BuyStatus, BuyUrgency, URGENCY_OPTIONS } from '../../../core/models/buy-item.model';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;

@Component({
  selector: 'app-buy-list-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="buy-form">
      <div class="form-group">
        <label class="label">What is it? *</label>
        <input class="input" formControlName="name" placeholder="e.g. Insulated water bottle" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Category</label>
          <input class="input" formControlName="category" placeholder="Home, gadget, clothing…" />
        </div>
        <div class="form-group">
          <label class="label">Status</label>
          <select class="input" formControlName="status">
            @for (s of statuses; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Urgency</label>
          <select class="input" formControlName="urgency">
            @for (u of urgencies; track u.value) {
              <option [value]="u.value">{{ u.label }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label class="label">Estimated price</label>
          <div class="combo">
            <input class="input" type="number" min="0" step="10" formControlName="estimatedPrice" placeholder="0" />
            <select class="input narrow" formControlName="currency">
              @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Where to buy</label>
          <input class="input" formControlName="store" placeholder="Amazon / Decathlon / local shop" />
        </div>
        <div class="form-group">
          <label class="label">Product link</label>
          <input class="input" formControlName="link" placeholder="https://..." />
        </div>
      </div>

      @if (form.value.status === 'BOUGHT') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Actually paid</label>
            <input class="input" type="number" min="0" step="10" formControlName="boughtPrice" placeholder="What you actually paid" />
          </div>
          <div class="form-group">
            <label class="label">Bought on</label>
            <input class="input" type="date" formControlName="boughtAt" />
          </div>
        </div>
      }

      <div class="form-group">
        <label class="label">Notes</label>
        <textarea class="input" formControlName="notes" rows="2" placeholder="Specs, color preference, anything to remember"></textarea>
      </div>

      <div class="form-actions">
        @if (item) {
          <button type="button" class="btn-ghost danger" (click)="deleted.emit()">Delete</button>
        }
        <div class="actions-right">
          <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
            {{ loading ? 'Saving…' : (item ? 'Update' : 'Save') }}
          </button>
        </div>
      </div>
    </form>
  `,
  styles: [`
    .buy-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .combo { display: flex; gap: 4px; }
    .combo .narrow { width: 80px; flex-shrink: 0; }
    textarea.input { resize: vertical; min-height: 60px; }
    .form-actions { display: flex; gap: 0.75rem; align-items: center; padding-top: 0.5rem; }
    .actions-right { display: flex; gap: 0.75rem; margin-left: auto; }
    .btn-ghost.danger { color: #ef4444; }
    .btn-ghost.danger:hover { background: rgba(239, 68, 68, 0.1); }
    @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class BuyListFormComponent implements OnInit, OnChanges {
  @Input() item: BuyItem | null = null;
  @Input() defaultStatus: BuyStatus | null = null;
  @Output() saved = new EventEmitter<BuyItem>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private buyService = inject(BuyListService);

  loading = false;
  statuses = BUY_COLUMNS;
  urgencies = URGENCY_OPTIONS;
  currencies = CURRENCIES;

  form = this.fb.group({
    name: ['', Validators.required],
    category: [''],
    status: ['WANT' as BuyStatus],
    urgency: ['MEDIUM' as BuyUrgency],
    estimatedPrice: [null as number | null],
    boughtPrice: [null as number | null],
    currency: ['INR'],
    store: [''],
    link: [''],
    notes: [''],
    boughtAt: [''],
  });

  ngOnInit() { this.fillForm(); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] || changes['defaultStatus']) this.fillForm();
  }

  private fillForm() {
    if (!this.item) {
      this.form.reset({
        name: '', category: '',
        status: this.defaultStatus ?? 'WANT',
        urgency: 'MEDIUM',
        estimatedPrice: null, boughtPrice: null, currency: 'INR',
        store: '', link: '', notes: '', boughtAt: '',
      });
      return;
    }
    this.form.patchValue({
      name: this.item.name,
      category: this.item.category ?? '',
      status: this.item.status,
      urgency: this.item.urgency,
      estimatedPrice: this.item.estimatedPrice,
      boughtPrice: this.item.boughtPrice,
      currency: this.item.currency,
      store: this.item.store ?? '',
      link: this.item.link ?? '',
      notes: this.item.notes ?? '',
      boughtAt: this.item.boughtAt ? this.item.boughtAt.slice(0, 10) : '',
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const raw = this.form.value;
    const dto: any = {
      name: raw.name!,
      category: raw.category?.trim() || undefined,
      status: raw.status ?? 'WANT',
      urgency: raw.urgency ?? 'MEDIUM',
      estimatedPrice: raw.estimatedPrice ?? undefined,
      currency: raw.currency || 'INR',
      store: raw.store?.trim() || undefined,
      link: raw.link?.trim() || undefined,
      notes: raw.notes?.trim() || undefined,
    };
    if (raw.status === 'BOUGHT') {
      dto.boughtPrice = raw.boughtPrice ?? undefined;
      if (raw.boughtAt) dto.boughtAt = raw.boughtAt;
    }
    const op$ = this.item
      ? this.buyService.update(this.item.id, dto)
      : this.buyService.create(dto);
    op$.subscribe({
      next: (i) => { this.loading = false; this.saved.emit(i); },
      error: () => { this.loading = false; },
    });
  }
}
