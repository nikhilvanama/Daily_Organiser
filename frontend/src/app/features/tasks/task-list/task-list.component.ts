// Import Angular core utilities: Component, inject for DI, OnInit lifecycle hook
import { PageArtComponent } from '../../../shared/components/page-art/page-art.component';
import { Component, inject, OnInit } from '@angular/core';
// RouterLink creates navigable links to individual task detail pages
import { RouterLink } from '@angular/router';
// DatePipe formats due dates
import { DatePipe, TitleCasePipe } from '@angular/common';
// FormBuilder creates the filter form; ReactiveFormsModule enables [formGroup] in the template
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { Task, PLAN_TYPES, TaskStatus, PlanType } from '../../../core/models/task.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
// Custom duotone category glyphs (replaces the emoji icons)
import { PlanIconComponent } from '../../../shared/components/plan-icon/plan-icon.component';
import { parseNaturalLanguagePlan, ParsedSmartPlan } from '../../../core/utils/smart-capture.util';

// TaskListComponent ("My Plans" page) displays all the user's tasks/plans with filtering
// by plan type (chips), status, and priority. Each plan row shows type icon, title, metadata,
// priority badge, a status dropdown, and edit/delete action buttons.
@Component({
  selector: 'app-task-list', // Loaded by the router at /tasks
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, DatePipe, TitleCasePipe, FormsModule, ReactiveFormsModule, ModalComponent, TaskFormComponent, ConfirmDialogComponent, PlanIconComponent, PageArtComponent],
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
        <!-- Opens the modal for creating a new plan -->
        <button class="btn-primary" (click)="openCreateModal()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Plan
        </button>
      </div>

      <!-- Natural Language Quick Add ("Smart Capture") -->
      <div class="card smart-capture-card">
        <div class="smart-input-row">
          <div class="smart-icon" title="Quick Add active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#smartGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <defs>
                <linearGradient id="smartGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#10b981"/>
                  <stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
              </defs>
              <path d="M12 2l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z"/>
            </svg>
          </div>
          <input
            type="text"
            class="smart-input"
            [(ngModel)]="smartInput"
            (input)="onSmartInputChange()"
            (keydown.enter)="$event.preventDefault(); submitSmartCapture()"
            placeholder="Quick Add: e.g. 'Flight to Mumbai tomorrow at 6:30am #trip !high' or 'Dinner at Starbucks on Saturday 8pm'..."
          />
          <button class="btn-primary sm-btn" (click)="submitSmartCapture()" [disabled]="!smartInput.trim() || isSubmittingSmart">
            {{ isSubmittingSmart ? 'Adding...' : '+ Quick Add' }}
          </button>
        </div>

        @if (parsedSmartPlan; as p) {
          <div class="smart-preview-chips">
            <span class="preview-label">Parsed preview:</span>
            <span class="preview-chip type-chip" [style.background]="getPlanTypeColor(p.type) + '22'" [style.color]="getPlanTypeColor(p.type)">
              {{ getPlanTypeIcon(p.type) }} {{ p.type | titlecase }}
            </span>
            @if (p.dueDate) {
              <span class="preview-chip date-chip">📅 {{ p.dueDate | date:'MMM d, y' }}</span>
            }
            @if (p.startTime) {
              <span class="preview-chip time-chip">⏰ {{ p.startTime }}</span>
            }
            @if (p.location) {
              <span class="preview-chip loc-chip">📍 {{ p.location }}</span>
            }
            <span class="preview-chip prio-chip prio-{{ p.priority.toLowerCase() }}">⚡ {{ p.priority }}</span>
            <span class="preview-title" [title]="p.title">"{{ p.title }}"</span>
          </div>
        }
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

      <!-- Status and priority filter dropdowns + View mode toggle at right end -->
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

        <div class="filter-spacer"></div>

        <!-- View mode toggle at right end of filters row -->
        <div class="view-toggle">
          <button class="view-btn" [class.active]="viewMode === 'list'" (click)="setViewMode('list')" title="List View" aria-label="List View">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span class="view-btn-text">List</span>
          </button>
          <button class="view-btn" [class.active]="viewMode === 'kanban'" (click)="setViewMode('kanban')" title="Kanban Board View" aria-label="Kanban Board View">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>
            <span class="view-btn-text">Board</span>
          </button>
        </div>
      </div>

      @if (viewMode === 'list') {
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
                      @if (subtaskInfo(plan); as st) {
                        <span class="meta-subtask-badge" [class.complete]="st.done === st.total" [title]="st.done + ' of ' + st.total + ' checklist items completed'">
                          ☑ {{ st.done }}/{{ st.total }}
                        </span>
                      }
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
      } @else {
        <!-- Kanban Board View -->
        <div class="kanban-wrap">
          <div class="kanban-grid">
            <!-- Column 1: To Do -->
            <div class="kanban-column todo-col">
              <div class="kanban-col-header">
                <div class="kanban-col-title">
                  <span class="status-indicator todo-ind"></span>
                  <span class="col-name">To Do</span>
                  <span class="col-pill">{{ todoTasks.length }}</span>
                </div>
                <button class="kanban-quick-add" (click)="openCreateModal('TODO')" title="Add to To Do">+</button>
              </div>

              <div class="kanban-cards">
                @if (todoTasks.length === 0) {
                  <div class="kanban-empty">No to-do plans</div>
                } @else {
                  @for (plan of todoTasks; track plan.id) {
                    <div class="kanban-card">
                      <div class="k-card-header">
                        <div class="k-badges">
                          <span class="k-cat-pill" [style.color]="getPlanTypeColor(plan.type)" [style.background]="getPlanTypeColor(plan.type) + '18'">
                            <app-plan-icon [type]="plan.type" [size]="11" />
                            <span>{{ plan.type | titlecase }}</span>
                          </span>
                          <span class="k-prio-dot prio-{{ plan.priority.toLowerCase() }}" [title]="'Priority: ' + plan.priority"></span>
                        </div>
                        <div class="k-tools">
                          <button class="k-tool-btn" (click)="editPlan(plan)" title="Edit plan" aria-label="Edit">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button class="k-tool-btn danger" (click)="deletePlan(plan)" title="Delete plan" aria-label="Delete">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </div>

                      <a [routerLink]="['/tasks', toSlug(plan.title)]" class="k-title" [title]="plan.title">
                        {{ plan.title }}
                      </a>

                      @if (plan.location) {
                        <div class="k-loc" [title]="plan.location">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span class="k-loc-text">{{ plan.location }}</span>
                        </div>
                      }

                      <div class="k-card-footer">
                        <div class="k-meta-group">
                          @if (plan.dueDate) {
                            <span class="k-meta-tag">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {{ plan.dueDate | date:'MMM d' }}
                              @if (plan.startTime) { · {{ plan.startTime }} }
                            </span>
                          }
                          @if (subtaskInfo(plan); as st) {
                            <span class="k-subtask-tag" [class.complete]="st.done === st.total" [title]="st.done + '/' + st.total + ' checklist items completed'">
                              ☑ {{ st.done }}/{{ st.total }}
                            </span>
                          }
                        </div>
                        <div class="k-actions-group">
                          <button class="k-pill-action start" (click)="moveStatus(plan, 'IN_PROGRESS')" title="Move to In Progress">
                            Start →
                          </button>
                          <button class="k-icon-action done" (click)="moveStatus(plan, 'DONE')" title="Mark Done">
                            ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>

            <!-- Column 2: In Progress -->
            <div class="kanban-column in-prog-col">
              <div class="kanban-col-header">
                <div class="kanban-col-title">
                  <span class="status-indicator in-prog-ind"></span>
                  <span class="col-name">In Progress</span>
                  <span class="col-pill">{{ inProgressTasks.length }}</span>
                </div>
                <button class="kanban-quick-add" (click)="openCreateModal('IN_PROGRESS')" title="Add to In Progress">+</button>
              </div>

              <div class="kanban-cards">
                @if (inProgressTasks.length === 0) {
                  <div class="kanban-empty">No active plans</div>
                } @else {
                  @for (plan of inProgressTasks; track plan.id) {
                    <div class="kanban-card in-prog">
                      <div class="k-card-header">
                        <div class="k-badges">
                          <span class="k-cat-pill" [style.color]="getPlanTypeColor(plan.type)" [style.background]="getPlanTypeColor(plan.type) + '18'">
                            <app-plan-icon [type]="plan.type" [size]="11" />
                            <span>{{ plan.type | titlecase }}</span>
                          </span>
                          <span class="k-prio-dot prio-{{ plan.priority.toLowerCase() }}" [title]="'Priority: ' + plan.priority"></span>
                        </div>
                        <div class="k-tools">
                          <button class="k-tool-btn" (click)="editPlan(plan)" title="Edit plan" aria-label="Edit">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button class="k-tool-btn danger" (click)="deletePlan(plan)" title="Delete plan" aria-label="Delete">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </div>

                      <a [routerLink]="['/tasks', toSlug(plan.title)]" class="k-title" [title]="plan.title">
                        {{ plan.title }}
                      </a>

                      @if (plan.location) {
                        <div class="k-loc" [title]="plan.location">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span class="k-loc-text">{{ plan.location }}</span>
                        </div>
                      }

                      <div class="k-card-footer">
                        <div class="k-meta-group">
                          @if (plan.dueDate) {
                            <span class="k-meta-tag">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {{ plan.dueDate | date:'MMM d' }}
                              @if (plan.startTime) { · {{ plan.startTime }} }
                            </span>
                          }
                          @if (subtaskInfo(plan); as st) {
                            <span class="k-subtask-tag" [class.complete]="st.done === st.total" [title]="st.done + '/' + st.total + ' checklist items completed'">
                              ☑ {{ st.done }}/{{ st.total }}
                            </span>
                          }
                        </div>
                        <div class="k-actions-group">
                          <button class="k-icon-action back" (click)="moveStatus(plan, 'TODO')" title="Back to To Do">
                            ←
                          </button>
                          <button class="k-pill-action done" (click)="moveStatus(plan, 'DONE')" title="Mark Done">
                            ✓ Done
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>

            <!-- Column 3: Done -->
            <div class="kanban-column done-col">
              <div class="kanban-col-header">
                <div class="kanban-col-title">
                  <span class="status-indicator done-ind"></span>
                  <span class="col-name">Done</span>
                  <span class="col-pill">{{ doneTasks.length }}</span>
                </div>
                <button class="kanban-quick-add" (click)="openCreateModal('DONE')" title="Add to Done">+</button>
              </div>

              <div class="kanban-cards">
                @if (doneTasks.length === 0) {
                  <div class="kanban-empty">No completed plans</div>
                } @else {
                  @for (plan of doneTasks; track plan.id) {
                    <div class="kanban-card is-done">
                      <div class="k-card-header">
                        <div class="k-badges">
                          <span class="k-cat-pill" [style.color]="getPlanTypeColor(plan.type)" [style.background]="getPlanTypeColor(plan.type) + '18'">
                            <app-plan-icon [type]="plan.type" [size]="11" />
                            <span>{{ plan.type | titlecase }}</span>
                          </span>
                          <span class="k-prio-dot prio-{{ plan.priority.toLowerCase() }}" [title]="'Priority: ' + plan.priority"></span>
                        </div>
                        <div class="k-tools">
                          <button class="k-tool-btn" (click)="editPlan(plan)" title="Edit plan" aria-label="Edit">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button class="k-tool-btn danger" (click)="deletePlan(plan)" title="Delete plan" aria-label="Delete">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </div>

                      <a [routerLink]="['/tasks', toSlug(plan.title)]" class="k-title strike" [title]="plan.title">
                        {{ plan.title }}
                      </a>

                      @if (plan.location) {
                        <div class="k-loc" [title]="plan.location">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span class="k-loc-text">{{ plan.location }}</span>
                        </div>
                      }

                      <div class="k-card-footer">
                        <div class="k-meta-group">
                          @if (plan.dueDate) {
                            <span class="k-meta-tag">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {{ plan.dueDate | date:'MMM d' }}
                              @if (plan.startTime) { · {{ plan.startTime }} }
                            </span>
                          }
                          @if (subtaskInfo(plan); as st) {
                            <span class="k-subtask-tag" [class.complete]="st.done === st.total" [title]="st.done + '/' + st.total + ' checklist items completed'">
                              ☑ {{ st.done }}/{{ st.total }}
                            </span>
                          }
                        </div>
                        <div class="k-actions-group">
                          <button class="k-pill-action reopen" (click)="moveStatus(plan, 'TODO')" title="Reopen plan">
                            ↩ Reopen
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      }
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

    /* Natural Language Quick Add ("Smart Capture") Bar */
    .smart-capture-card {
      padding: 10px 14px; background: var(--card-surface, var(--bg-card));
      border: 1px solid var(--card-border, var(--border)); border-radius: 14px;
      display: flex; flex-direction: column; gap: 8px; margin-bottom: 2px;
    }
    .smart-input-row { display: flex; align-items: center; gap: 10px; }
    .smart-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .smart-input {
      flex: 1; border: none; background: transparent; font-size: 0.88rem; color: var(--text-primary);
      outline: none; font-family: inherit;
    }
    .smart-input::placeholder { color: var(--text-muted); font-size: 0.82rem; }
    .sm-btn { padding: 7px 14px; font-size: 0.8rem; }
    .smart-preview-chips {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-top: 6px;
      border-top: 1px dashed var(--border-light); font-size: 0.74rem;
    }
    .preview-label { color: var(--text-muted); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
    .preview-chip {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px;
      font-size: 0.72rem; font-weight: 500; background: var(--bg-secondary);
      border: 1px solid var(--border-light); color: var(--text-secondary);
    }
    .preview-chip.prio-high { color: #ef4444; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
    .preview-chip.prio-medium { color: #f59e0b; background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); }
    .preview-chip.prio-low { color: #10b981; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }
    .preview-title {
      color: var(--text-primary); font-weight: 600; font-style: italic; max-width: 250px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* Filter bar & View mode toggle */
    .filter-bar { display: flex; gap: 10px; padding: 10px 14px; align-items: center; flex-wrap: wrap; }
    .filter-input { width: auto; min-width: 130px; padding: 7px 12px; font-size: 0.82rem; }
    .sm { font-size: 0.78rem; padding: 7px 12px; }
    .filter-spacer { flex: 1; min-width: 8px; }
    .view-toggle {
      display: inline-flex; background: var(--bg-secondary); padding: 3px; border-radius: 10px;
      border: 1px solid var(--border); margin-left: auto;
    }
    .view-btn {
      display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; font-size: 0.8rem;
      font-weight: 500; border: none; background: transparent; color: var(--text-muted);
      cursor: pointer; border-radius: 7px; transition: all 0.15s; font-family: inherit;
    }
    .view-btn.active {
      background: var(--card-surface, var(--bg-card)); color: var(--text-primary);
      font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .view-btn-text { display: inline; }

    /* Subtask Badge in List */
    .meta-subtask-badge {
      display: inline-flex; align-items: center; gap: 3px; font-size: 0.72rem; color: var(--text-muted);
      padding: 1px 6px; background: var(--bg-hover); border-radius: 4px; font-weight: 500;
    }
    .meta-subtask-badge.complete { color: #10b981; background: rgba(16, 185, 129, 0.12); }

    /* Kanban Board Styles */
    .kanban-wrap { width: 100%; margin-top: 4px; }
    .kanban-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; align-items: start;
    }
    .kanban-column {
      background: var(--card-surface, var(--bg-card)); border: 1px solid var(--card-border, var(--border));
      border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 10px; min-height: 240px;
    }
    .kanban-col-header {
      display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px;
      border-bottom: 1px solid var(--border-light);
    }
    .kanban-col-title {
      display: flex; align-items: center; gap: 8px; font-size: 0.86rem; font-weight: 600;
      color: var(--text-primary);
    }
    .status-indicator { width: 8px; height: 8px; border-radius: 50%; }
    .todo-ind { background: #3b82f6; box-shadow: 0 0 6px rgba(59, 130, 246, 0.6); }
    .in-prog-ind { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); }
    .done-ind { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6); }
    .col-pill {
      font-size: 0.72rem; padding: 1px 7px; border-radius: 10px; background: var(--bg-secondary);
      color: var(--text-muted); font-weight: 600;
    }
    .kanban-quick-add {
      width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border);
      background: transparent; color: var(--text-muted); cursor: pointer; display: flex;
      align-items: center; justify-content: center; font-size: 1rem; line-height: 1; transition: all 0.15s;
    }
    .kanban-quick-add:hover {
      border-color: var(--accent); color: var(--accent); background: var(--accent-subtle);
    }
    .kanban-cards { display: flex; flex-direction: column; gap: 8px; }
    .kanban-empty {
      text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.82rem; font-style: italic;
    }

    /* Restructured Compact Kanban Card */
    .kanban-card {
      background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 10px;
      padding: 9px 11px; display: flex; flex-direction: column; gap: 6px;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; position: relative;
    }
    .kanban-card:hover {
      transform: translateY(-1.5px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); border-color: var(--border);
    }
    .kanban-card.in-prog { border-left: 3px solid #f59e0b; }
    .kanban-card.is-done { border-left: 3px solid #10b981; opacity: 0.78; }

    .k-card-header {
      display: flex; align-items: center; justify-content: space-between; gap: 6px;
    }
    .k-badges {
      display: flex; align-items: center; gap: 6px; min-width: 0;
    }
    .k-cat-pill {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px;
      border-radius: 5px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.01em;
    }
    .k-prio-dot {
      width: 6.5px; height: 6.5px; border-radius: 50%; flex-shrink: 0;
    }
    .k-prio-dot.prio-high { background: #ef4444; box-shadow: 0 0 5px rgba(239, 68, 68, 0.6); }
    .k-prio-dot.prio-medium { background: #f59e0b; box-shadow: 0 0 5px rgba(245, 158, 11, 0.6); }
    .k-prio-dot.prio-low { background: #10b981; box-shadow: 0 0 5px rgba(16, 185, 129, 0.6); }

    .k-tools {
      display: flex; align-items: center; gap: 2px; opacity: 0.65; transition: opacity 0.15s;
    }
    .kanban-card:hover .k-tools { opacity: 1; }
    .k-tool-btn {
      width: 20px; height: 20px; border-radius: 4px; border: none; background: transparent;
      color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .k-tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .k-tool-btn.danger:hover { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

    .k-title {
      font-size: 0.84rem; font-weight: 600; color: var(--text-primary); text-decoration: none;
      word-break: break-word; line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .k-title:hover { color: var(--accent); }
    .k-title.strike { text-decoration: line-through; color: var(--text-muted); }

    .k-loc {
      display: flex; align-items: center; gap: 3.5px; font-size: 0.72rem; color: var(--text-muted);
    }
    .k-loc-text {
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .k-card-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 6px;
      padding-top: 5px; border-top: 1px solid var(--border-light); margin-top: 2px;
    }
    .k-meta-group {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0;
    }
    .k-meta-tag {
      display: inline-flex; align-items: center; gap: 3px; font-size: 0.7rem; color: var(--text-muted); font-weight: 500;
    }
    .k-subtask-tag {
      font-size: 0.68rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-card);
      padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border-light);
    }
    .k-subtask-tag.complete { color: #10b981; border-color: rgba(16, 185, 129, 0.3); }

    .k-actions-group {
      display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: auto;
    }
    .k-pill-action {
      padding: 2px 7px; font-size: 0.69rem; font-weight: 600; border-radius: 5px;
      border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-secondary);
      cursor: pointer; transition: all 0.15s; font-family: inherit;
    }
    .k-pill-action.start:hover {
      background: rgba(245, 158, 11, 0.12); color: #f59e0b; border-color: rgba(245, 158, 11, 0.4);
    }
    .k-pill-action.done:hover {
      background: rgba(16, 185, 129, 0.12); color: #10b981; border-color: rgba(16, 185, 129, 0.4);
    }
    .k-pill-action.reopen:hover {
      background: rgba(59, 130, 246, 0.12); color: #3b82f6; border-color: rgba(59, 130, 246, 0.4);
    }
    .k-icon-action {
      width: 21px; height: 21px; border-radius: 5px; border: 1px solid var(--border-light);
      background: var(--bg-card); color: var(--text-secondary); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; transition: all 0.15s;
    }
    .k-icon-action.done:hover {
      background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.4);
    }
    .k-icon-action.back:hover {
      background: var(--bg-hover); color: var(--text-primary);
    }

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

    /* Plan location (clean text with map pin, no pill background) */
    .plan-loc {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.74rem; font-weight: 500; color: var(--text-muted);
      width: fit-content; max-width: 100%;
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
      display: flex; align-items: center; gap: 10px; font-size: 0.74rem; color: var(--text-muted);
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

      /* Compact responsive filter bar with view toggle on the right */
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        flex-wrap: wrap;
      }
      .filter-input {
        flex: 1 1 calc(50% - 4px);
        min-width: 110px;
        padding: 7px 10px;
        font-size: 0.78rem;
      }
      .filter-bar .btn-ghost {
        padding: 6px 12px;
        font-size: 0.78rem;
      }
      .filter-spacer {
        display: none;
      }
      .view-toggle {
        margin-left: auto;
      }
      .view-btn {
        padding: 5px 8px;
      }
      .view-btn-text {
        display: none;
      }

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

      /* Complete plan location: clean text without pill background */
      .plan-loc {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.74rem;
        font-weight: 500;
        color: var(--text-muted);
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
        gap: 9px;
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

      .kanban-grid {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        gap: 12px;
        padding-bottom: 10px;
        scrollbar-width: thin;
      }
      .kanban-column {
        flex: 0 0 85%;
        min-width: 85%;
        scroll-snap-align: center;
      }
      .smart-capture-card {
        padding: 8px 12px;
      }
      .smart-input-row {
        gap: 8px;
      }
      .smart-input-row .sm-btn {
        padding: 6px 10px;
        font-size: 0.78rem;
        white-space: nowrap;
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

  // View mode: 'list' or 'kanban'
  viewMode: 'list' | 'kanban' = (localStorage.getItem('do_plans_view') as any) || 'list';

  setViewMode(mode: 'list' | 'kanban') {
    this.viewMode = mode;
    localStorage.setItem('do_plans_view', mode);
  }

  // Quick Add state
  smartInput = '';
  parsedSmartPlan: ParsedSmartPlan | null = null;
  isSubmittingSmart = false;

  onSmartInputChange() {
    this.parsedSmartPlan = parseNaturalLanguagePlan(this.smartInput);
  }

  submitSmartCapture() {
    const parsed = this.parsedSmartPlan || parseNaturalLanguagePlan(this.smartInput);
    if (!parsed || !parsed.title.trim()) return;

    this.isSubmittingSmart = true;
    this.taskService.create({
      title: parsed.title,
      type: parsed.type,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      startTime: parsed.startTime,
      location: parsed.location,
      status: 'TODO',
    }).subscribe({
      next: () => {
        this.isSubmittingSmart = false;
        this.smartInput = '';
        this.parsedSmartPlan = null;
        this.toast.success('Plan created with Quick Add!');
        this.loadTasks();
      },
      error: () => {
        this.isSubmittingSmart = false;
        this.toast.error('Failed to create plan');
      }
    });
  }

  getPlanTypeColor(type: PlanType): string {
    return this.planTypes.find(t => t.value === type)?.color ?? '#3b82f6';
  }

  getPlanTypeIcon(type: PlanType): string {
    return this.planTypes.find(t => t.value === type)?.icon ?? '✓';
  }

  subtaskInfo(plan: Task): { done: number; total: number; pct: number } | null {
    if (!plan.subtasks || plan.subtasks.length === 0) return null;
    const done = plan.subtasks.filter(s => s.completed).length;
    const total = plan.subtasks.length;
    const pct = Math.round((done / total) * 100);
    return { done, total, pct };
  }

  get todoTasks(): Task[] {
    return this.sortedTasks.filter(t => t.status === 'TODO');
  }

  get inProgressTasks(): Task[] {
    return this.sortedTasks.filter(t => t.status === 'IN_PROGRESS');
  }

  get doneTasks(): Task[] {
    return this.sortedTasks.filter(t => t.status === 'DONE');
  }

  moveStatus(plan: Task, status: TaskStatus) {
    this.taskService.update(plan.id, { status }).subscribe({
      next: () => {
        const label = status === 'IN_PROGRESS' ? 'In Progress' : (status === 'DONE' ? 'Done' : 'To Do');
        this.toast.success(`Moved to ${label}`);
      }
    });
  }

  openCreateModal(status?: TaskStatus) {
    if (status) {
      this.editingTask = { status } as any;
    } else {
      this.editingTask = null;
    }
    this.showForm = true;
  }

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
