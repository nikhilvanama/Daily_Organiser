// Import Angular decorators and utilities: Component, EventEmitter for outputs, inject for DI, Input/Output for bindings, OnInit lifecycle
import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
// FormBuilder creates the reactive form; ReactiveFormsModule enables [formGroup]; Validators for field validation
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// GoalService provides create() and update() methods for saving goals
import { GoalService } from '../goal.service';
// Goal model interface for typing the input binding
import { Goal } from '../../../core/models/goal.model';

// GoalFormComponent is a reusable form for creating and editing goals.
// It is used inside a ModalComponent by the goal-list page.
// When an existing goal is passed via the [goal] input, the form pre-fills for editing.
@Component({
  selector: 'app-goal-form', // Used as <app-goal-form [goal]="..." (saved)="..." (cancelled)="...">
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule], // Enable reactive forms in the template
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="goal-form">
      <!-- Title field: required for every goal -->
      <div class="form-group">
        <label class="label">Title *</label>
        <input class="input" formControlName="title" placeholder="Goal title" />
      </div>
      <!-- Description field: optional longer text -->
      <div class="form-group">
        <label class="label">Description</label>
        <textarea class="input" formControlName="description" rows="3" placeholder="Describe your goal…"></textarea>
      </div>
      <!-- Status and Target Date in a two-column grid -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Status</label>
          <!-- Status dropdown: ACTIVE (default), PAUSED, COMPLETED, ABANDONED -->
          <select class="input" formControlName="status">
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABANDONED">Abandoned</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label">Target Date</label>
          <!-- Optional target completion date -->
          <input class="input" type="date" formControlName="targetDate" />
        </div>
      </div>
      <!-- Form actions: Cancel and Submit buttons -->
      <div class="form-actions">
        <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <!-- Button label changes between "Create" and "Update" based on edit mode -->
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving…' : (goal ? 'Update' : 'Create') }}
        </button>
      </div>
    </form>
  `,
  // Compact inline styles for the form layout (minified for brevity)
  styles: [`.goal-form{display:flex;flex-direction:column;gap:1rem}.form-group{display:flex;flex-direction:column;gap:.25rem}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}textarea.input{resize:vertical}.form-actions{display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem}`],
})
export class GoalFormComponent implements OnInit, OnChanges {
  // Optional input: when provided, the form operates in edit mode with pre-filled values
  @Input() goal: Goal | null = null;
  // Emitted when the goal is successfully saved (created or updated)
  @Output() saved = new EventEmitter<void>();
  // Emitted when the user clicks the Cancel button
  @Output() cancelled = new EventEmitter<void>();

  // Inject dependencies
  private fb = inject(FormBuilder); // For creating the reactive form
  private goalService = inject(GoalService); // For create/update API calls

  // Loading flag to disable the submit button during API calls
  loading = false;
  // Reactive form: title is required, everything else is optional
  form = this.fb.group({
    title: ['', Validators.required], // Required goal title
    description: [''], // Optional description
    status: ['ACTIVE'], // Default status for new goals
    targetDate: [''], // Optional target completion date
  });

  ngOnInit() { this.fillForm(); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['goal']) this.fillForm();
  }

  private fillForm() {
    if (this.goal) {
      this.form.patchValue({
        title: this.goal.title,
        description: this.goal.description ?? '',
        status: this.goal.status,
        targetDate: this.goal.targetDate ? this.goal.targetDate.split('T')[0] : '',
      });
    } else {
      this.form.reset({ title: '', description: '', status: 'ACTIVE', targetDate: '' });
    }
  }

  submit() {
    if (this.form.invalid) return; // Guard against invalid form state
    this.loading = true;
    const value = this.form.value;
    // Build the DTO, converting empty strings to undefined so the backend ignores them
    const dto: any = {
      title: value.title,
      description: value.description || undefined,
      status: value.status,
      targetDate: value.targetDate || undefined,
    };

    // Choose create or update based on whether an existing goal was provided
    const req = this.goal ? this.goalService.update(this.goal.id, dto) : this.goalService.create(dto);
    req.subscribe({
      next: () => {
        this.loading = false;
        this.form.reset({ title: '', description: '', status: 'ACTIVE', targetDate: '' });
        this.saved.emit();
      },
      error: () => { this.loading = false; }, // Failure: re-enable the button
    });
  }
}
