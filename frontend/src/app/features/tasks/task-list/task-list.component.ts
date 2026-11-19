// Import Angular core utilities: Component, inject for DI, OnInit lifecycle hook
import { PageArtComponent } from '../../../shared/components/page-art/page-art.component';
import { Component, inject, OnInit } from '@angular/core';
// RouterLink creates navigable links to individual task detail pages
import { RouterLink } from '@angular/router';
// DatePipe formats due dates
import { DatePipe } from '@angular/common';
// FormBuilder creates the filter form; ReactiveFormsModule enables [formGroup] in the template
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
// TaskService provides the tasks$ observable and CRUD methods
import { TaskService } from '../task.service';
import { slugify } from '../../../core/utils/slugify';
// ModalComponent wraps the task form in a dialog
import { ModalComponent } from '../../../shared/components/modal/modal.component';
// TaskFormComponent renders the plan creation/edit form inside the modal
import { TaskFormComponent } from '../task-form/task-form.component';
// ToastService shows success/error feedback after task operations
import { ToastService } from '../../../core/services/toast.service';
// Task model and PLAN_TYPES for type-specific icons and colors
import { Task, PLAN_TYPES } from '../../../core/models/task.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
// Custom duotone category glyphs (replaces the emoji icons)
import { PlanIconComponent } from '../../../shared/components/plan-icon/plan-icon.component';

// TaskListComponent ("My Plans" page) displays all the user's tasks/plans with filtering
// by plan type (chips), status, and priority. Each plan row shows type icon, title, metadata,
// priority badge, a status dropdown, and edit/delete action buttons.
@Component({
  selector: 'app-task-list', // Loaded by the router at /tasks
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, DatePipe, ReactiveFormsModule, ModalComponent, TaskFormComponent, ConfirmDialogComponent, PlanIconComponent, PageArtComponent],
  template: `
    <!-- Page container with fade-in animation -->
    <div class="page animate-in">
      <!-- Page header: title + "Add Plan" button -->
      <div class="page-header">
        <app-page-art scene="plans" />
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
            <app-plan-icon [type]="t.value" [size]="14"
              [style.color]="activeType === t.value ? '#fff' : t.color" />
            {{ t.label }}
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
        @if (sortedTasks.length === 0) {
          <div class="empty">
            <p>No plans found. Create your first plan!</p>
          </div>
        } @else {
          <div class="plans-list">
            <!-- Iterate over the paginated, sorted tasks (DONE rows pushed to the bottom) -->
            @for (plan of pagedTasks; track plan.id) {
              <!-- Each plan row: type icon, title/metadata, priority badge, status dropdown, actions -->
              <div class="plan-row" [class.done]="plan.status === 'DONE'">
                <div class="plan-header-side" [class.has-loc]="!!plan.location">
                  <!-- Plan type icon: white custom glyph on a glowing gradient tile -->
                  <div class="plan-type-icon" [style.background]="tileBg(plan.type)" [style.box-shadow]="tileShadow(plan.type)">
                    <app-plan-icon [type]="plan.type" [size]="19" />
                  </div>
                  <!-- Main content: title (links to detail page) + location -->
                  <div class="plan-main">
                    <div class="plan-title-wrap">
                      <a [routerLink]="['/tasks', toSlug(plan.title)]" class="plan-title" [title]="plan.title">{{ plan.title }}</a>
                    </div>
                    @if (plan.location) {
                      <div class="plan-loc" [title]="plan.location">
                        <svg class="loc-pin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span class="loc-text">{{ plan.location }}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="plan-controls">
                  <!-- Left side: Priority color dot in front of date / time / category -->
                  <div class="plan-meta-left">
                    <span class="prio-dot prio-{{ plan.priority.toLowerCase() }}" [title]="'Priority: ' + plan.priority"></span>
                    @if (plan.dueDate) {
                      <span class="meta-item">
                        <svg class="meta-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {{ plan.dueDate | date:'MMM d' }}{{ plan.endDate ? ' → ' + (plan.endDate | date:'MMM d') : '' }}
                      </span>
                    }
                    @if (plan.departureTime) { <span class="meta-item">🕐 {{ plan.departureTime }}{{ plan.endTime ? ' → ' + plan.endTime : '' }}</span> }
                    @if (plan.startTime) { <span class="meta-item">🕐 {{ plan.startTime }}{{ plan.endTime ? ' - ' + plan.endTime : '' }}</span> }
                    @if (plan.category) { <span class="meta-category" [style.color]="plan.category.color">● {{ plan.category.name }}</span> }
                  </div>

                  <div class="plan-ctrl-right">
                    <!-- Inline status dropdown: allows quick status changes without opening the detail page -->
                    <select class="status-select" [value]="plan.status" (change)="updateStatus(plan, $any($event.target).value)" aria-label="Change status">
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <!-- Action buttons: edit and delete -->
                    <div class="plan-actions">
                      <!-- Edit button: opens the modal with the task pre-filled -->
                      <button class="icon-btn" (click)="editPlan(plan)" title="Edit plan" aria-label="Edit plan">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <!-- Delete button: asks for confirmation, then removes the task -->
                      <button class="icon-btn danger" (click)="deletePlan(plan)" title="Delete plan" aria-label="Delete plan">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          @if (totalPages > 1) {
            <div class="pager">
              <button class="btn-ghost sm" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">Prev</button>
              <span class="pager-info">Page {{ currentPage }} of {{ totalPages }} · {{ sortedTasks.length }} plans</span>
              <button class="btn-ghost sm" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">Next</button>
            </div>
          }
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
    /* Individual chip: pill-shaped button with border + custom category icon */
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
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

    /* Each plan row: desktop row with clean separation */
    .plan-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 12px 14px; border-radius: 8px; transition: background 0.15s ease;
      border-bottom: 1px solid var(--border);
    }
    .plan-row:last-child { border-bottom: none; }
    .plan-row:hover { background: var(--bg-hover); }
    /* Done plans: reduced opacity and strikethrough title */
    .plan-row.done { opacity: 0.55; }
    .plan-row.done .plan-title { text-decoration: line-through; }

    /* Left header side on desktop: icon + main content */
    .plan-header-side {
      display: flex; align-items: center; gap: 12px;
      flex: 1; min-width: 0;
    }
    .plan-header-side.has-loc {
      align-items: stretch;
    }

    /* Plan type icon: white custom glyph on a glowing gradient tile */
    .plan-type-icon {
      width: 36px; height: 36px; border-radius: 11px; color: #fff;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .plan-header-side.has-loc .plan-type-icon {
      width: 42px; height: auto; align-self: stretch; min-height: 44px; border-radius: 12px;
    }

    /* Main content column */
    .plan-main { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
    .plan-title-wrap { display: flex; align-items: center; gap: 8px; }
    /* Plan title: clickable link to the detail page */
    .plan-title {
      font-size: 0.9rem; font-weight: 500; color: var(--text-primary);
      text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      transition: color 0.15s;
    }
    .plan-title:hover { color: var(--accent); }

    /* Plan location chip */
    .plan-loc {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.74rem; font-weight: 500; color: var(--text-secondary);
      background: var(--bg-hover); padding: 2px 7px; border-radius: 6px;
      border: 1px solid var(--border-light); width: fit-content; max-width: 100%;
      line-height: 1.25;
    }
    .loc-pin { flex-shrink: 0; color: var(--accent); }
    .loc-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Controls: priority dot + date/time on left, status + actions on right */
    .plan-controls {
      display: flex; align-items: center; gap: 14px;
      flex-shrink: 0;
    }
    .plan-meta-left {
      display: flex; align-items: center; gap: 8px; font-size: 0.74rem; color: var(--text-muted);
    }
    .prio-dot {
      width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0;
    }
    .prio-dot.prio-high { background: var(--red, #ef4444); box-shadow: 0 0 6px rgba(239, 68, 68, 0.55); }
    .prio-dot.prio-medium { background: var(--orange, #f59e0b); box-shadow: 0 0 6px rgba(245, 158, 11, 0.55); }
    .prio-dot.prio-low { background: var(--green, #10b981); box-shadow: 0 0 6px rgba(16, 185, 129, 0.55); }

    .meta-item { display: inline-flex; align-items: center; gap: 4px; }
    .meta-icon { opacity: 0.75; }
    .meta-category { font-weight: 500; }

    .plan-ctrl-right { display: flex; align-items: center; gap: 8px; }
    .status-select {
      font-size: 0.78rem; padding: 5px 8px; border-radius: 8px;
      background: var(--bg-input); border: 1px solid var(--border);
      color: var(--text-primary); cursor: pointer;
    }
    .plan-actions { display: flex; gap: 4px; }

    /* ═══════════════════════════════════════════════════════
       MOBILE REDESIGN (max-width: 768px)
       ═══════════════════════════════════════════════════════ */
    @media (max-width: 768px) {
      app-page-art { display: none; }

      /* Category filter chips: smooth horizontal scrolling pill row */
      .type-filters {
        display: flex;
        gap: 6px;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding: 2px 2px 6px;
        scrollbar-width: none;
      }
      .type-filters::-webkit-scrollbar { display: none; }
      .chip { padding: 6px 12px; font-size: 0.76rem; flex-shrink: 0; }

      /* Compact responsive filter bar */
      .filter-bar {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 8px;
        padding: 8px 10px;
        align-items: center;
      }
      .filter-input { width: 100%; min-width: 0; padding: 7px 10px; font-size: 0.78rem; }
      .filter-bar .btn-ghost { padding: 7px 12px; font-size: 0.78rem; }

      /* Mobile Card layout for plans list */
      .plans-wrap {
        background: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .plans-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0;
      }

      .plan-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 10px 12px 8px;
        background: var(--card-surface);
        border: 1px solid var(--card-border);
        border-radius: 13px;
        box-shadow: var(--card-shadow);
      }
      .plan-row:last-child { border-bottom: 1px solid var(--card-border); }
      .plan-row:hover { background: var(--card-surface); }

      .plan-header-side {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }

      /* Only if right side in 2 lines [title, location in each line]:
         the left side icon height should match right side [title, location] height */
      .plan-header-side.has-loc {
        align-items: stretch;
      }

      .plan-type-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        margin-top: 0;
      }

      .plan-header-side.has-loc .plan-type-icon {
        width: 42px;
        height: auto;
        align-self: stretch;
        min-height: 44px;
        border-radius: 11px;
      }

      .plan-main {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 3px;
        min-width: 0;
        flex: 1;
      }

      .plan-title-wrap {
        display: block;
        width: 100%;
      }
      /* Complete plan title: multi-line wrap, full readability */
      .plan-title {
        display: block;
        font-size: 0.92rem;
        font-weight: 600;
        line-height: 1.3;
        color: var(--text-primary);
        white-space: normal;
        overflow: visible;
        word-break: break-word;
      }

      /* Complete plan location: prominent chip on its own line */
      .plan-loc {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.74rem;
        font-weight: 500;
        color: var(--text-secondary);
        background: var(--bg-hover);
        padding: 2px 7px;
        border-radius: 6px;
        border: 1px solid var(--border-light);
        margin-top: 1px;
        width: fit-content;
        max-width: 100%;
        line-height: 1.25;
      }
      .loc-text {
        white-space: normal;
        overflow: visible;
        word-break: break-word;
      }

      /* Bottom controls footer: priority dot + date/time on left, status + actions on right */
      .plan-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding-top: 7px;
        margin-top: 0;
        border-top: 1px solid var(--border-light);
        gap: 8px;
      }
      .plan-meta-left {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        font-size: 0.72rem;
        color: var(--text-muted);
        min-width: 0;
        flex: 1;
      }
      .prio-dot {
        width: 7.5px;
        height: 7.5px;
      }
      .plan-ctrl-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .status-select {
        height: 28px;
        font-size: 0.74rem;
        padding: 0 6px;
        border-radius: 7px;
      }
      .plan-actions {
        display: flex;
        gap: 2px;
      }
      .plan-actions .icon-btn {
        width: 28px;
        height: 28px;
        border-radius: 7px;
      }

      .pager {
        background: var(--card-surface);
        border: 1px solid var(--card-border);
        border-radius: 12px;
        margin-top: 4px;
      }
    }

    @media (max-width: 380px) {
      .filter-bar {
        grid-template-columns: 1fr 1fr;
      }
      .filter-bar .btn-ghost {
        grid-column: span 2;
        text-align: center;
      }
    }

    /* Empty state centered message */
    .empty { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem; }

    /* Pagination bar below the plans list */
    .pager {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 14px; border-top: 1px solid var(--border);
    }
    .pager-info { font-size: 0.78rem; color: var(--text-muted); }
    .pager .btn-ghost[disabled] { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class TaskListComponent implements OnInit {
  readonly toSlug = slugify;
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

  // Local copy of tasks with DONE rows pushed to the bottom; drives pagination.
  sortedTasks: Task[] = [];
  pageSize = 15;
  currentPage = 1;

  // On initialization, load tasks and subscribe to filter changes
  ngOnInit() {
    this.loadTasks(); // Initial load with no filters
    // Re-fetch tasks whenever the filter dropdowns change
    this.filterForm.valueChanges.subscribe(() => this.loadTasks());
    // Re-sort & re-paginate whenever the underlying task list changes
    this.taskService.tasks$.subscribe((tasks) => {
      this.sortedTasks = [...tasks].sort((a, b) => {
        const aDone = a.status === 'DONE' ? 1 : 0;
        const bDone = b.status === 'DONE' ? 1 : 0;
        // DONE rows sink to the bottom; within DONE, latest date first.
        if (aDone !== bDone) return aDone - bDone;
        if (aDone === 1) return this.planDateKey(b) - this.planDateKey(a);
        return 0;
      });
      // Clamp current page if the list shrank (e.g. after deletion or filter change)
      if (this.currentPage > this.totalPages) this.currentPage = Math.max(1, this.totalPages);
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.sortedTasks.length / this.pageSize));
  }

  get pagedTasks(): Task[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedTasks.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // Pick the best date to sort by: dueDate, then completedAt, then updatedAt.
  private planDateKey(plan: Task): number {
    const raw = plan.dueDate ?? plan.completedAt ?? plan.updatedAt;
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  }

  // Fetch tasks from the backend with the current filter values
  loadTasks() {
    const filters: Record<string, string> = { ...this.filterForm.value as any };
    if (this.activeType) filters['type'] = this.activeType; // Add type filter if a chip is active
    this.currentPage = 1; // Filter change resets pagination to the first page
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

  // Gradient + glow per plan type for the row icon tiles — same visual
  // language as the dashboard checklist tiles.
  private static readonly TILES: Record<string, { bg: string; glow: string }> = {
    task:        { bg: 'linear-gradient(140deg, #60a5fa, #2563eb)', glow: 'rgba(59, 130, 246, .45)' },
    trip:        { bg: 'linear-gradient(140deg, #4ade80, #059669)', glow: 'rgba(16, 185, 129, .45)' },
    train:       { bg: 'linear-gradient(140deg, #818cf8, #4f46e5)', glow: 'rgba(99, 102, 241, .45)' },
    dinner:      { bg: 'linear-gradient(140deg, #fb923c, #ea580c)', glow: 'rgba(249, 115, 22, .45)' },
    meeting:     { bg: 'linear-gradient(140deg, #a78bfa, #6d28d9)', glow: 'rgba(139, 92, 246, .45)' },
    event:       { bg: 'linear-gradient(140deg, #22d3ee, #0891b2)', glow: 'rgba(6, 182, 212, .45)' },
    reminder:    { bg: 'linear-gradient(140deg, #fde047, #f59e0b)', glow: 'rgba(245, 158, 11, .45)' },
    outing:      { bg: 'linear-gradient(140deg, #f9a8d4, #db2777)', glow: 'rgba(236, 72, 153, .45)' },
    health:      { bg: 'linear-gradient(140deg, #2dd4bf, #0d9488)', glow: 'rgba(20, 184, 166, .45)' },
    celebration: { bg: 'linear-gradient(140deg, #fb7185, #e11d48)', glow: 'rgba(244, 63, 94, .45)' },
  };
  private tile(type: string) { return TaskListComponent.TILES[type] ?? TaskListComponent.TILES['task']; }
  tileBg(type: string): string { return this.tile(type).bg; }
  tileShadow(type: string): string {
    return `inset 0 1.5px 0 rgba(255,255,255,.4), 0 4px 12px ${this.tile(type).glow}`;
  }
}
