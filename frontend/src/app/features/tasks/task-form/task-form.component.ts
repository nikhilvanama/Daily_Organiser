// Import Angular decorators: Component, EventEmitter for outputs, inject for DI, Input/Output for bindings, OnInit lifecycle
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
// FormBuilder creates the reactive form; ReactiveFormsModule enables [formGroup]; Validators for field validation
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// AsyncPipe subscribes to the categories$ observable for the category dropdown
import { AsyncPipe } from '@angular/common';
// TaskService provides create() and update() methods for saving tasks
import { TaskService } from '../task.service';
// CategoryService provides categories$ for the category selection dropdown
import { CategoryService } from '../../categories/category.service';
// Task model and PLAN_TYPES for the plan type selector chips
import { Task, PLAN_TYPES } from '../../../core/models/task.model';

// TaskFormComponent is a reusable form for creating and editing tasks/plans.
// It is used inside a ModalComponent by both the dashboard and task-list pages.
// When an existing task is passed via the [task] input, the form pre-fills for editing.
@Component({
  selector: 'app-task-form', // Used as <app-task-form [task]="..." (saved)="..." (cancelled)="...">
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule, AsyncPipe], // Enable reactive forms and async pipe
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="plan-form">
      <!-- Plan Type Selector: row of pill-shaped buttons for choosing the plan type -->
      <div class="type-selector">
        @for (t of planTypes; track t.value) {
          <!-- Each type button: toggles the form's type value; active state styled with type-specific color -->
          <button type="button" class="type-btn" [class.active]="form.value.type === t.value"
            [style.--type-color]="t.color" (click)="form.patchValue({type: t.value})">
            <span class="type-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
        }
      </div>

      <!-- Title field: required for every plan -->
      <div class="form-group">
        <label class="label">Title *</label>
        <input class="input" formControlName="title" placeholder="What's the plan?" />
      </div>

      <!-- Description field: optional longer text -->
      <div class="form-group">
        <label class="label">Description</label>
        <textarea class="input" formControlName="description" rows="2" placeholder="Optional details..."></textarea>
      </div>

      <!-- Date and Priority in a two-column grid -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Date</label>
          <input class="input" type="date" formControlName="dueDate" />
        </div>
        <div class="form-group">
          <label class="label">Priority</label>
          <select class="input" formControlName="priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <!-- Start Time and End Time in a two-column grid -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Start Time</label>
          <input class="input" type="time" formControlName="startTime" />
        </div>
        <div class="form-group">
          <label class="label">End Time</label>
          <input class="input" type="time" formControlName="endTime" />
        </div>
      </div>

      <!-- Location field: optional venue for trips, dinners, meetings, etc. -->
      <div class="form-group">
        <label class="label">Location</label>
        <input class="input" formControlName="location" placeholder="e.g. Office, Station, Restaurant..." />
      </div>

      <!-- Category and Status in a two-column grid -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Category</label>
          <!-- Dropdown populated from the user's categories via CategoryService -->
          <select class="input" formControlName="categoryId">
            <option value="">No category</option>
            @for (cat of catService.categories$ | async; track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label class="label">Status</label>
          <select class="input" formControlName="status">
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Form actions: Cancel and Submit buttons -->
      <div class="form-actions">
        <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <!-- Button label changes based on whether this is a create or update operation -->
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving...' : (task ? 'Update Plan' : 'Add Plan') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    /* Form container: vertical flex column with spacing between fields */
    .plan-form { display: flex; flex-direction: column; gap: 1rem; }

    /* Plan type selector: wrapping row of pill buttons */
    .type-selector { display: flex; gap: 6px; flex-wrap: wrap; }
    /* Individual type button: pill-shaped with icon + label */
    .type-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 12px; border-radius: 20px;
      font-size: 0.78rem; font-weight: 500; cursor: pointer;
      border: 1.5px solid var(--border); background: transparent;
      color: var(--text-secondary); transition: all 0.15s; font-family: inherit;
    }
    /* Hover: show the type's specific color on border and text */
    .type-btn:hover { border-color: var(--type-color); color: var(--type-color); }
    /* Active: filled background with the type's color */
    .type-btn.active { background: var(--type-color); color: #fff; border-color: var(--type-color); }
    .type-icon { font-size: 0.85rem; }

    /* Form group and row layout utilities */
    .form-group { display: flex; flex-direction: column; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    /* Resizable textarea with minimum height */
    textarea.input { resize: vertical; min-height: 60px; }
    /* Action buttons aligned to the right */
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
  `],
})
export class TaskFormComponent implements OnInit {
  // Optional input: when provided, the form operates in edit mode with pre-filled values
  @Input() task: Task | null = null;
  // Emitted when the task is successfully saved (created or updated)
  @Output() saved = new EventEmitter<void>();
  // Emitted when the user clicks the Cancel button
  @Output() cancelled = new EventEmitter<void>();

  // Inject dependencies
  private fb = inject(FormBuilder); // For creating the reactive form
  private taskService = inject(TaskService); // For create/update API calls
  // Expose CategoryService publicly so the template can read categories$ for the dropdown
  catService = inject(CategoryService);
  // Reference to PLAN_TYPES for the type selector buttons
  planTypes = PLAN_TYPES;

  // Loading flag to disable the submit button during API calls
  loading = false;
  // Reactive form with all task fields — title is required, everything else is optional
  form = this.fb.group({
    title: ['', Validators.required], // Required plan title
    description: [''], // Optional description
    type: ['task'], // Default plan type
    priority: ['MEDIUM'], // Default priority
    status: ['TODO'], // Default status
    dueDate: [''], // Optional date (ISO string)
    startTime: [''], // Optional start time (HH:mm)
    endTime: [''], // Optional end time (HH:mm)
    location: [''], // Optional location/venue
    categoryId: [''], // Optional category assignment
  });

  // On init, if an existing task was passed, pre-fill the form with its current values
  ngOnInit() {
    if (this.task) {
      this.form.patchValue({
        title: this.task.title,
        description: this.task.description ?? '',
        type: (this.task as any).type ?? 'task', // Fallback to 'task' if type is missing
        priority: this.task.priority,
        status: this.task.status,
        dueDate: this.task.dueDate ? this.task.dueDate.split('T')[0] : '', // Extract date portion from ISO string
        startTime: this.task.startTime ?? '',
        endTime: this.task.endTime ?? '',
        location: this.task.location ?? '',
        categoryId: this.task.categoryId ?? '',
      });
    }
  }

  // Handle form submission — build DTO, call create or update, emit saved event
  submit() {
    if (this.form.invalid) return; // Guard against invalid form state
    this.loading = true;
    const v = this.form.value;
    // Build the DTO, converting empty strings to undefined so the backend ignores them
    const dto: any = {
      title: v.title,
      description: v.description || undefined,
      type: v.type,
      priority: v.priority,
      status: v.status,
      dueDate: v.dueDate || undefined,
      startTime: v.startTime || undefined,
      endTime: v.endTime || undefined,
      location: v.location || undefined,
      categoryId: v.categoryId || undefined,
    };

    // Choose create or update based on whether an existing task was provided
    const req = this.task ? this.taskService.update(this.task.id, dto) : this.taskService.create(dto);
    req.subscribe({
      next: () => { this.loading = false; this.saved.emit(); }, // Success: notify parent
      error: () => { this.loading = false; }, // Failure: just re-enable the button (toast is handled by parent)
    });
  }
}
