import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HabitService } from '../habit.service';
import { Habit, WEEKDAY_LABELS, WEEKDAY_VALUES } from '../../../core/models/habit.model';

const ICON_CHOICES = ['✓', '📖', '🏃', '🧘', '💪', '🛌', '✏️', '🎯', '☀️', '🏢'];
const COLOR_CHOICES = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#06b6d4'];

@Component({
  selector: 'app-habit-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="habit-form">
      <div class="form-group">
        <label class="label">Title *</label>
        <input class="input" formControlName="title" placeholder="e.g. Read 30 minutes" />
      </div>

      <div class="form-group">
        <label class="label">Description</label>
        <textarea class="input" formControlName="description" rows="2" placeholder="Optional notes"></textarea>
      </div>

      <div class="form-group">
        <label class="label">Days of week</label>
        <div class="weekday-row">
          @for (label of weekdayLabels; track label; let i = $index) {
            <button type="button" class="weekday-chip" [class.active]="weekdaySelected[i]" (click)="toggleWeekday(i)">{{ label }}</button>
          }
        </div>
        <div class="hint">{{ selectedCount }} day{{ selectedCount === 1 ? '' : 's' }} per week</div>
      </div>

      <div class="form-row time-row">
        <div class="form-group">
          <label class="label">Start time</label>
          <input class="input" type="time" formControlName="startTime" />
        </div>
        <div class="form-group">
          <label class="label">End time</label>
          <input class="input" type="time" formControlName="endTime" />
        </div>
        <div class="form-group reminder-group">
          <label class="label">Reminder</label>
          <label class="toggle">
            <input type="checkbox" formControlName="reminderEnabled" />
            <span>Notify me</span>
          </label>
        </div>
      </div>
      @if (timeRangeInvalid) {
        <div class="error-hint">End time must be after start time.</div>
      }

      <div class="form-group">
        <label class="label">Icon</label>
        <div class="icon-row">
          @for (ic of icons; track ic) {
            <button type="button" class="icon-chip" [class.active]="form.value.icon === ic" (click)="form.patchValue({ icon: ic })">{{ ic }}</button>
          }
        </div>
      </div>

      <div class="form-group">
        <label class="label">Color</label>
        <div class="color-row">
          @for (c of colors; track c) {
            <button type="button" class="color-chip" [class.active]="form.value.color === c" [style.background]="c" (click)="form.patchValue({ color: c })"></button>
          }
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="form.invalid || selectedCount === 0 || timeRangeInvalid || loading">
          {{ loading ? 'Saving…' : (habit ? 'Update' : 'Create') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .habit-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .time-row { grid-template-columns: 1fr 1fr auto; align-items: end; }
    .error-hint { font-size: 0.75rem; color: #ef4444; margin-top: -4px; }
    @media (max-width: 520px) {
      .time-row { grid-template-columns: 1fr 1fr; }
      .time-row .reminder-group { grid-column: 1 / -1; }
    }
    textarea.input { resize: vertical; }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 0.5rem; }
    .hint { font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; }

    .weekday-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .weekday-chip {
      padding: 6px 10px; border-radius: 6px; border: 1.5px solid var(--border); background: transparent;
      color: var(--text-secondary); cursor: pointer; font-size: 0.78rem; font-weight: 600; min-width: 44px;
      transition: all 0.15s; font-family: inherit;
    }
    .weekday-chip:hover { border-color: var(--text-muted); }
    .weekday-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    .reminder-group .toggle { display: flex; align-items: center; gap: 6px; padding: 9px 0; font-size: 0.85rem; color: var(--text-primary); cursor: pointer; }
    .reminder-group input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }

    .icon-row, .color-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .icon-chip {
      width: 36px; height: 36px; border-radius: 8px; border: 1.5px solid var(--border);
      background: transparent; cursor: pointer; font-size: 1.1rem; transition: all 0.15s;
    }
    .icon-chip:hover { border-color: var(--text-muted); }
    .icon-chip.active { border-color: var(--accent); background: var(--bg-hover); }
    .color-chip {
      width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer;
      transition: all 0.15s;
    }
    .color-chip.active { border-color: var(--text-primary); transform: scale(1.15); }
  `],
})
export class HabitFormComponent implements OnInit, OnChanges {
  @Input() habit: Habit | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private habitService = inject(HabitService);

  loading = false;
  weekdayLabels = WEEKDAY_LABELS;
  // UI index parallel to WEEKDAY_LABELS (Mon-first). Default to weekdays Mon-Fri checked.
  weekdaySelected: boolean[] = [true, true, true, true, true, false, false];
  icons = ICON_CHOICES;
  colors = COLOR_CHOICES;

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    startTime: [''],
    endTime: [''],
    reminderEnabled: [false],
    icon: ['✓'],
    color: ['#10b981'],
  });

  get timeRangeInvalid(): boolean {
    const s = this.form.value.startTime ?? '';
    const e = this.form.value.endTime ?? '';
    return !!s && !!e && e <= s;
  }

  ngOnInit() { this.fillForm(); }
  ngOnChanges(changes: SimpleChanges) { if (changes['habit']) this.fillForm(); }

  get selectedCount(): number { return this.weekdaySelected.filter(Boolean).length; }

  toggleWeekday(uiIndex: number) {
    this.weekdaySelected = this.weekdaySelected.map((v, i) => (i === uiIndex ? !v : v));
  }

  private fillForm() {
    if (!this.habit) {
      this.weekdaySelected = [true, true, true, true, true, false, false];
      this.form.reset({
        title: '', description: '', startTime: '', endTime: '',
        reminderEnabled: false, icon: '✓', color: '#10b981',
      });
      return;
    }
    const selected = WEEKDAY_VALUES.map((v) => this.habit!.weekdays.includes(v));
    this.weekdaySelected = selected;
    this.form.patchValue({
      title: this.habit.title,
      description: this.habit.description ?? '',
      startTime: this.habit.startTime ?? '',
      endTime: this.habit.endTime ?? '',
      reminderEnabled: this.habit.reminderEnabled,
      icon: this.habit.icon,
      color: this.habit.color,
    });
  }

  submit() {
    if (this.form.invalid || this.selectedCount === 0 || this.timeRangeInvalid) return;
    this.loading = true;
    const raw = this.form.value;
    const weekdays = WEEKDAY_VALUES.filter((_, i) => this.weekdaySelected[i]);
    const dto = {
      title: raw.title!,
      description: raw.description || undefined,
      startTime: raw.startTime || undefined,
      endTime: raw.endTime || undefined,
      reminderEnabled: !!raw.reminderEnabled,
      icon: raw.icon!,
      color: raw.color!,
      weekdays: [...weekdays],
    };
    const op$ = this.habit
      ? this.habitService.update(this.habit.id, dto)
      : this.habitService.create(dto);
    op$.subscribe({
      next: () => { this.loading = false; this.saved.emit(); },
      error: () => { this.loading = false; },
    });
  }
}
