// Import Angular core utilities: Component, inject for DI, OnInit lifecycle, signal for reactive state
import { Component, inject, OnInit, signal } from '@angular/core';
// RouterLink creates navigable links to individual goal detail pages
import { RouterLink } from '@angular/router';
// AsyncPipe subscribes to goals$ BehaviorSubject; DecimalPipe formats progress percentages
import { AsyncPipe, DecimalPipe } from '@angular/common';
// GoalService provides the goals$ observable and CRUD methods
import { GoalService } from '../goal.service';
// ModalComponent wraps the goal form in a dialog
import { ModalComponent } from '../../../shared/components/modal/modal.component';
// GoalFormComponent renders the goal creation/edit form inside the modal
import { GoalFormComponent } from '../goal-form/goal-form.component';
// ToastService shows success/error feedback after goal operations
import { ToastService } from '../../../core/services/toast.service';
// Goal model interface for typing
import { Goal } from '../../../core/models/goal.model';

// GoalListComponent displays all user goals as a responsive card grid.
// Each card shows the goal title, status badge, description, progress bar,
// milestone count, and edit/delete action buttons.
@Component({
  selector: 'app-goal-list', // Loaded by the router at /goals
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, AsyncPipe, DecimalPipe, ModalComponent, GoalFormComponent],
  template: `
    <!-- Page container with fade-in animation -->
    <div class="page animate-in">
      <!-- Page header: title + goal count + "New Goal" button -->
      <div class="page-header">
        <div>
          <h2>Goals</h2>
          <!-- Display the total count of goals -->
          <p>{{ (goalService.goals$ | async)?.length ?? 0 }} goals</p>
        </div>
        <!-- Opens the modal with an empty GoalFormComponent for creating a new goal -->
        <button class="btn-primary" (click)="showForm = true">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Goal
        </button>
      </div>

      <!-- Responsive card grid: auto-fills columns at 300px minimum width -->
      <div class="goals-grid">
        @for (goal of goalService.goals$ | async; track goal.id) {
          <div class="goal-card card">
            <!-- Card header: goal title (link to detail) + status badge -->
            <div class="goal-card-header">
              <a [routerLink]="['/goals', goal.id]" class="goal-title">{{ goal.title }}</a>
              <span class="badge goal-status-{{ goal.status.toLowerCase() }}">{{ goal.status }}</span>
            </div>
            <!-- Optional description: clamped to 2 lines with ellipsis overflow -->
            @if (goal.description) {
              <p class="goal-desc">{{ goal.description }}</p>
            }

            <!-- Progress bar section: label, percentage, and filled track -->
            <div class="progress-section">
              <div class="progress-header">
                <span class="progress-label">Progress</span>
                <span class="progress-value">{{ goal.progress | number:'1.0-0' }}%</span>
              </div>
              <div class="progress-track">
                <!-- Width dynamically set to the goal's progress percentage -->
                <div class="progress-fill" [style.width.%]="goal.progress"></div>
              </div>
            </div>

            <!-- Footer: milestone count + edit/delete actions -->
            <div class="goal-footer">
              <span class="milestone-count">{{ goal.milestones.length }} milestone{{ goal.milestones.length !== 1 ? 's' : '' }}</span>
              <div class="goal-actions">
                <!-- Edit button: opens the modal pre-filled with this goal's data -->
                <button class="icon-btn" (click)="editGoal(goal)" title="Edit">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <!-- Delete button: asks for confirmation before removing the goal -->
                <button class="icon-btn danger" (click)="deleteGoal(goal.id)" title="Delete">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        } @empty {
          <!-- Empty state: shown when no goals exist, with a CTA button -->
          <div class="empty-full card">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            <p>No goals yet. Set your first goal!</p>
            <button class="btn-primary" (click)="showForm = true">Create Goal</button>
          </div>
        }
      </div>
    </div>

    <!-- Modal for creating or editing a goal -->
    <app-modal [isOpen]="showForm" [title]="editingGoal ? 'Edit Goal' : 'New Goal'" (close)="closeForm()">
      <app-goal-form [goal]="editingGoal" (saved)="onSaved()" (cancelled)="closeForm()" />
    </app-modal>
  `,
  styles: [`
    /* Page layout: vertical flex with spacing */
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-header h2 { font-size: 1.375rem; font-weight: 700; margin: 0 0 0.25rem; color: var(--text-primary); }
    .page-header p { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
    /* Responsive card grid: auto-fill columns, minimum 300px each */
    .goals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    /* Goal card: padded flex column */
    .goal-card { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.875rem; }
    .goal-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    /* Goal title: clickable link to the detail page */
    .goal-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); text-decoration: none; flex: 1; }
    .goal-title:hover { color: var(--accent); }
    /* Status badge colors for each goal status */
    .goal-status-active    { background: #f0fdf4; color: #15803d; }
    .goal-status-completed { background: var(--accent-light); color: var(--accent); }
    .goal-status-paused    { background: #fffbeb; color: #92400e; }
    .goal-status-abandoned { background: #fef2f2; color: #b91c1c; }
    /* Dark theme overrides for status badge backgrounds */
    [data-theme="dark"] .goal-status-active    { background: #052e16; }
    [data-theme="dark"] .goal-status-completed { background: #052e16; }
    [data-theme="dark"] .goal-status-paused    { background: #451a03; }
    [data-theme="dark"] .goal-status-abandoned { background: #450a0a; }
    /* Description: clamped to 2 lines */
    .goal-desc { font-size: 0.875rem; color: var(--text-secondary); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    /* Progress bar section */
    .progress-section { display: flex; flex-direction: column; gap: 0.375rem; }
    .progress-header { display: flex; justify-content: space-between; }
    .progress-label { font-size: 0.75rem; color: var(--text-muted); }
    .progress-value { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
    /* Progress track: rounded bar with accent-colored fill */
    .progress-track { height: 6px; background: var(--bg-secondary); border-radius: 9999px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--accent); border-radius: 9999px; transition: width 0.4s ease; }
    /* Footer: milestone count on the left, action buttons on the right */
    .goal-footer { display: flex; justify-content: space-between; align-items: center; }
    .milestone-count { font-size: 0.75rem; color: var(--text-muted); }
    .goal-actions { display: flex; gap: 0.25rem; }
    /* Icon buttons for edit/delete */
    .icon-btn { background: transparent; border: none; padding: 0.375rem; border-radius: 0.375rem; cursor: pointer; color: var(--text-secondary); display: flex; }
    .icon-btn:hover { background: var(--bg-secondary); }
    .icon-btn.danger:hover { background: #fef2f2; color: var(--red); }
    /* Empty state: full-width card spanning all grid columns */
    .empty-full { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; color: var(--text-muted); grid-column: 1 / -1; }
  `],
})
export class GoalListComponent implements OnInit {
  // Expose GoalService publicly so the template can subscribe to goals$ via async pipe
  goalService = inject(GoalService);
  // ToastService for success/error feedback
  private toast = inject(ToastService);

  // Controls visibility of the create/edit modal
  showForm = false;
  // Holds the goal being edited (null for new goal creation)
  editingGoal: Goal | null = null;

  // On init, fetch all goals from the backend
  ngOnInit() { this.goalService.loadAll().subscribe(); }

  // Open the edit modal pre-filled with the selected goal's data
  editGoal(goal: Goal) { this.editingGoal = goal; this.showForm = true; }

  // Delete a goal after user confirmation
  deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return; // Confirm before destructive action
    this.goalService.delete(id).subscribe({
      next: () => this.toast.success('Goal deleted'),
      error: () => this.toast.error('Failed to delete goal'),
    });
  }

  // Called when the form saves — close modal and show appropriate success message
  onSaved() { this.closeForm(); this.toast.success(this.editingGoal ? 'Goal updated' : 'Goal created'); }
  // Close the modal and reset the editing state
  closeForm() { this.showForm = false; this.editingGoal = null; }
}
