// Import Angular core utilities: Component, inject for DI, OnInit lifecycle hook
import { Component, inject, OnInit } from '@angular/core';
// RouterLink creates navigable links to individual task detail pages
import { RouterLink } from '@angular/router';
// AsyncPipe subscribes to tasks$ BehaviorSubject; DatePipe formats due dates
import { AsyncPipe, DatePipe } from '@angular/common';
// FormBuilder creates the filter form; ReactiveFormsModule enables [formGroup] in the template
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
// TaskService provides the tasks$ observable and CRUD methods
import { TaskService } from '../task.service';
// ModalComponent wraps the task form in a dialog
import { ModalComponent } from '../../../shared/components/modal/modal.component';
// TaskFormComponent renders the plan creation/edit form inside the modal
import { TaskFormComponent } from '../task-form/task-form.component';
// ToastService shows success/error feedback after task operations
import { ToastService } from '../../../core/services/toast.service';
// Task model and PLAN_TYPES for type-specific icons and colors
import { Task, PLAN_TYPES } from '../../../core/models/task.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

// TaskListComponent ("My Plans" page) displays all the user's tasks/plans with filtering
// by plan type (chips), status, and priority. Each plan row shows type icon, title, metadata,
// priority badge, a status dropdown, and edit/delete action buttons.
@Component({
  selector: 'app-task-list', // Loaded by the router at /tasks
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, AsyncPipe, DatePipe, ReactiveFormsModule, ModalComponent, TaskFormComponent, ConfirmDialogComponent],
  template: `
    <!-- Page container with fade-in animation -->
    <div class="page animate-in">
      <!-- Page header: title + "Add Plan" button -->
      <div class="page-header">
        <div>
          <h2>My Plans</h2>
          <p>All your tasks, trips, meetings & reminders</p>
        </div>
        <!-- Opens the modal with an empty TaskFormComponent for creating a new plan -->
        <button class="btn-primary" (click)="showForm = true">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Plan
        </button>
      </div>

      <!-- Plan type filter chips: "All" + one chip per plan type (task, trip, meeting, etc.) -->
      <div class="type-filters">
        <!-- "All" chip — clears the type filter -->
        <button class="chip" [class.active]="!activeType" (click)="filterType('')">All</button>
        <!-- Type-specific chips with icons and colors from PLAN_TYPES -->
        @for (t of planTypes; track t.value) {
          <button class="chip" [class.active]="activeType === t.value"
            [style.--chip-color]="t.color" (click)="filterType(t.value)">
            {{ t.icon }} {{ t.label }}
          </button>
        }
      </div>

      <!-- Status and priority filter dropdowns -->
      <div class="card filter-bar" [formGroup]="filterForm">
        <select class="input filter-input" formControlName="status">
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select class="input filter-input" formControlName="priority">
          <option value="">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <!-- Reset button clears all filters and reloads the unfiltered list -->
        <button class="btn-ghost sm" (click)="resetFilters()">Reset</button>
      </div>

      <!-- Plans list card -->
      <div class="card plans-wrap">
        <!-- Empty state when no plans match the current filters -->
        @if ((taskService.tasks$ | async)?.length === 0) {
          <div class="empty">
            <p>No plans found. Create your first plan!</p>
          </div>
        } @else {
          <div class="plans-list">
            <!-- Iterate over the tasks from the TaskService BehaviorSubject -->
            @for (plan of taskService.tasks$ | async; track plan.id) {
              <!-- Each plan row: type icon, title/metadata, priority badge, status dropdown, actions -->
              <div class="plan-row" [class.done]="plan.status === 'DONE'">
                <!-- Plan type icon: colored square with emoji -->
                <div class="plan-type-icon" [style.background]="getColor(plan.type) + '18'" [style.color]="getColor(plan.type)">
                  {{ getIcon(plan.type) }}
                </div>
                <!-- Main content: title (links to detail page) + metadata (date, time, category) -->
                <div class="plan-main">
                  <div class="plan-top">
                    <a [routerLink]="['/tasks', plan.id]" class="plan-title">{{ plan.title }}</a>
                    @if (plan.location) {
                      <span class="plan-loc">{{ plan.location }}</span>
                    }
                  </div>
                  <div class="plan-meta">
                    @if (plan.dueDate) {
                      <span>{{ plan.dueDate | date:'MMM d' }}{{ plan.endDate ? ' → ' + (plan.endDate | date:'MMM d') : '' }}</span>
                    }
                    @if (plan.departureTime) { <span>🕐 {{ plan.departureTime }}</span> }
                    @if (plan.startTime) { <span>{{ plan.startTime }}{{ plan.endTime ? ' - ' + plan.endTime : '' }}</span> }
                    @if (plan.category) { <span [style.color]="plan.category.color">{{ plan.category.name }}</span> }
                  </div>
                </div>
                <!-- Priority badge: color-coded (HIGH=red, MEDIUM=amber, LOW=green) -->
                <span class="badge badge-{{ plan.priority.toLowerCase() }}">{{ plan.priority }}</span>
                <!-- Inline status dropdown: allows quick status changes without opening the detail page -->
                <select class="status-select" [value]="plan.status" (change)="updateStatus(plan, $any($event.target).value)">
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <!-- Action buttons: edit and delete -->
                <div class="plan-actions">
                  <!-- Edit button: opens the modal with the task pre-filled -->
                  <button class="icon-btn" (click)="editPlan(plan)">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <!-- Delete button: asks for confirmation, then removes the task -->
                  <button class="icon-btn danger" (click)="deletePlan(plan)">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Modal for creating or editing a plan -->
    <app-modal [isOpen]="showForm" [title]="editingTask ? 'Edit Plan' : 'Add Plan'" (close)="closeForm()" maxWidth="560px">
      <app-task-form [task]="editingTask" (saved)="onSaved()" (cancelled)="closeForm()" />
    </app-modal>

    <app-confirm-dialog
      [isOpen]="showDeleteConfirm"
      title="Delete Plan"
      [message]="'Are you sure you want to delete &quot;' + (deletingPlanTitle) + '&quot;? This cannot be undone.'"
      confirmText="Delete"
      (confirmed)="confirmDelete()"
      (cancelled)="showDeleteConfirm = false"
    />
  `,
  styles: [`
    /* Plan type filter chips: horizontal wrapping row */
    .type-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    /* Individual chip: pill-shaped button with border */
    .chip {
      padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 500;
      border: 1.5px solid var(--border); background: transparent; color: var(--text-secondary);
      cursor: pointer; transition: all 0.15s; font-family: inherit;
    }
    .chip:hover { border-color: var(--text-muted); }
    /* Active chip: filled with accent color */
    .chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Filter bar: horizontal flex with dropdown selects and reset button */
    .filter-bar { display: flex; gap: 10px; padding: 10px 14px; align-items: center; flex-wrap: wrap; }
    .filter-input { width: auto; min-width: 130px; padding: 7px 12px; font-size: 0.82rem; }
    .sm { font-size: 0.78rem; padding: 7px 12px; }

    /* Plans list card */
    .plans-wrap { overflow: hidden; }
    .plans-list { padding: 0.25rem; }
    /* Each plan row: horizontal flex with border-bottom separator */
    .plan-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 8px; transition: background 0.1s;
      border-bottom: 1px solid var(--border);
    }
    .plan-row:last-child { border-bottom: none; }
    .plan-row:hover { background: var(--bg-hover); }
    /* Done plans: reduced opacity and strikethrough title */
    .plan-row.done { opacity: 0.55; }
    .plan-row.done .plan-title { text-decoration: line-through; }

    /* Plan type icon: colored rounded square with emoji */
    .plan-type-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }
    /* Main content column: grows to fill available space */
    .plan-main { flex: 1; min-width: 0; }
    .plan-top { display: flex; align-items: center; gap: 8px; }
    /* Plan title: clickable link to the detail page */
    .plan-title { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plan-title:hover { color: var(--accent); }
    .plan-loc { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
    /* Metadata row: date, time range, category name */
    .plan-meta { display: flex; gap: 8px; font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }
    /* Action buttons container */
    .plan-actions { display: flex; gap: 2px; }

    @media (max-width: 768px) {
      .type-filters { gap: 4px; }
      .chip { padding: 5px 10px; font-size: 0.72rem; }
      .plan-row { flex-wrap: wrap; gap: 8px; padding: 10px; }
      .plan-type-icon { width: 30px; height: 30px; font-size: 0.85rem; }
      .plan-title { font-size: 0.82rem; }
      .plan-meta { font-size: 0.68rem; }
      .status-select { font-size: 0.72rem; padding: 3px 6px; }
      .filter-bar { flex-direction: column; }
      .filter-input { width: 100%; min-width: auto; }
    }

    /* Empty state centered message */
    .empty { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem; }
  `],
})
export class TaskListComponent implements OnInit {
  // Expose TaskService publicly so the template can subscribe to tasks$ via async pipe
  taskService = inject(TaskService);
  // ToastService for success/error feedback after mutations
  private toast = inject(ToastService);
  // FormBuilder for creating the filter form
  private fb = inject(FormBuilder);
  // Reference to PLAN_TYPES for icons and colors
  planTypes = PLAN_TYPES;

  // Controls visibility of the create/edit modal
  showForm = false;
  // Holds the task being edited (null for new task creation)
  editingTask: Task | null = null;
  // Currently selected plan type filter (empty string = "All")
  activeType = '';
  // Reactive form for status and priority filter dropdowns
  filterForm = this.fb.group({ status: [''], priority: [''] });

  // On initialization, load tasks and subscribe to filter changes
  ngOnInit() {
    this.loadTasks(); // Initial load with no filters
    // Re-fetch tasks whenever the filter dropdowns change
    this.filterForm.valueChanges.subscribe(() => this.loadTasks());
  }

  // Fetch tasks from the backend with the current filter values
  loadTasks() {
    const filters: Record<string, string> = { ...this.filterForm.value as any };
    if (this.activeType) filters['type'] = this.activeType; // Add type filter if a chip is active
    this.taskService.loadAll(filters).subscribe();
  }

  // Set the active plan type filter and reload tasks
  filterType(type: string) { this.activeType = type; this.loadTasks(); }

  // Quick-update a task's status via the inline dropdown (no modal needed)
  updateStatus(task: Task, status: string) {
    this.taskService.update(task.id, { status: status as any }).subscribe();
  }

  // Open the edit modal pre-filled with the selected task's data
  editPlan(task: Task) { this.editingTask = task; this.showForm = true; }

  showDeleteConfirm = false;
  deletingPlanId = '';
  deletingPlanTitle = '';

  deletePlan(plan: any) {
    this.deletingPlanId = plan.id;
    this.deletingPlanTitle = plan.title;
    this.showDeleteConfirm = true;
  }

  confirmDelete() {
    this.taskService.delete(this.deletingPlanId).subscribe({ next: () => this.toast.success('Deleted') });
    this.showDeleteConfirm = false;
  }

  // Called when the form saves successfully — close modal, show toast, reload list
  onSaved() { this.closeForm(); this.toast.success('Saved'); this.loadTasks(); }
  // Close the modal and reset the editing state
  closeForm() { this.showForm = false; this.editingTask = null; }
  // Reset all filters to their default values and reload the unfiltered list
  resetFilters() { this.filterForm.reset({ status: '', priority: '' }); this.activeType = ''; this.loadTasks(); }

  // Helper methods to look up plan type color and icon from PLAN_TYPES
  getColor(type: string) { return this.planTypes.find((t) => t.value === type)?.color ?? '#3b82f6'; }
  getIcon(type: string) { return this.planTypes.find((t) => t.value === type)?.icon ?? '✓'; }
}
