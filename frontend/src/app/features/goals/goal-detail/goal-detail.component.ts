// Import Angular core utilities: Component, inject for DI, OnInit lifecycle, signal for reactive state, computed for derived state
import { Component, inject, OnInit, signal } from '@angular/core';
// ActivatedRoute reads the :id param; Router for navigation; RouterLink for back link
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
// FormBuilder creates the milestone form; ReactiveFormsModule enables [formGroup]; Validators for validation
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// DatePipe formats dates; DecimalPipe formats progress percentages
import { DatePipe, DecimalPipe } from '@angular/common';
// FormsModule enables [(ngModel)] for the mini-goal title input
import { FormsModule } from '@angular/forms';
// GoalService provides CRUD operations for goals, milestones, and mini-goals
import { GoalService } from '../goal.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
// Goal and GoalMilestone model interfaces for typing
import { Goal, GoalMilestone } from '../../../core/models/goal.model';

// GoalDetailComponent shows the full detail of a single goal, including:
// - Header card: title, description, target date, status badge, progress bar
// - Milestones card: list of milestones with completion checkboxes,
//   nested mini-goals (small checkboxes), add milestone form, add mini-goal form
// This is the most complex component in the goals feature due to the three-level hierarchy.
@Component({
  selector: 'app-goal-detail', // Loaded by the router at /goals/:id
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule, FormsModule, ConfirmDialogComponent],
  template: `
    <!-- Page container with fade-in animation -->
    <div class="page animate-in">
      <!-- Back navigation link to the goals list -->
      <a routerLink="/goals" class="back-link">← Back to Goals</a>

      <!-- Goal detail: only shown once the goal data is loaded -->
      @if (goal()) {
        <div class="goal-detail">
          <!-- Header Card: goal overview with title, description, target date, status, and progress -->
          <div class="card goal-header-card">
            <div class="goal-header">
              <div>
                <h1>{{ goal()!.title }}</h1>
                @if (goal()!.description) { <p class="goal-desc">{{ goal()!.description }}</p> }
                @if (goal()!.targetDate) {
                  <p class="target-date">Target: {{ goal()!.targetDate | date:'MMM d, y' }}</p>
                }
              </div>
              <!-- Status badge -->
              <span class="badge goal-status-badge">{{ goal()!.status }}</span>
            </div>
            <!-- Overall progress bar: width driven by the server-calculated progress percentage -->
            <div class="progress-section">
              <div class="progress-header">
                <span>Progress</span>
                <strong>{{ goal()!.progress | number:'1.0-0' }}%</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="goal()!.progress"></div>
              </div>
            </div>
          </div>

          <!-- Milestones Card: list of milestones with add form -->
          <div class="card milestones-card">
            <div class="milestones-header">
              <h2>Milestones</h2>
              <!-- Toggle button to show/hide the add milestone form -->
              <button class="btn-ghost sm" (click)="showAddForm = !showAddForm">
                {{ showAddForm ? 'Cancel' : '+ Add Milestone' }}
              </button>
            </div>

            <!-- Inline form for adding a new milestone (shown when toggled) -->
            @if (showAddForm) {
              <form [formGroup]="milestoneForm" (ngSubmit)="addMilestone()" class="milestone-form">
                <input class="input" formControlName="title" placeholder="Milestone title" />
                <input class="input" type="date" formControlName="dueDate" />
                <button class="btn-primary sm" type="submit" [disabled]="milestoneForm.invalid || addingMilestone">
                  {{ addingMilestone ? 'Adding...' : 'Add' }}
                </button>
              </form>
            }

            <!-- List of milestones with their mini-goals -->
            <div class="milestone-list">
              @for (m of goal()!.milestones; track m.id) {
                <div class="milestone-block">
                  <!-- Milestone row: checkbox, title, due date, add mini-goal button, delete button -->
                  <div class="milestone-row" [class.completed]="m.status === 'COMPLETED'">
                    <!-- Circular checkbox: click to mark the milestone as completed -->
                    <button class="milestone-check" (click)="completeMilestone(m)">
                      @if (m.status === 'COMPLETED') {
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </button>
                    <span class="milestone-title">{{ m.title }}</span>
                    @if (m.dueDate) {
                      <span class="milestone-due">{{ m.dueDate | date:'MMM d' }}</span>
                    }
                    <!-- Button to toggle the mini-goal add form for this milestone -->
                    <button class="icon-btn" (click)="toggleMiniForm(m.id)" title="Add mini-goal">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <!-- Delete milestone button -->
                    <button class="icon-btn danger" (click)="showDeleteMilestone(m)">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  <!-- Mini-goals: nested checklist items within this milestone -->
                  @if (m.miniGoals && m.miniGoals.length > 0) {
                    <div class="mini-goals">
                      @for (mg of m.miniGoals; track mg.id) {
                        <div class="mini-goal-row" [class.done]="mg.status === 'COMPLETED'">
                          <!-- Small square checkbox: toggles the mini-goal between PENDING/COMPLETED -->
                          <button class="mini-check" (click)="toggleMiniGoal(mg.id)">
                            @if (mg.status === 'COMPLETED') {
                              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            }
                          </button>
                          <span class="mini-title">{{ mg.title }}</span>
                          <!-- Delete mini-goal button: hidden by default, shown on row hover -->
                          <button class="icon-btn mini-del danger" (click)="removeMiniGoal(mg.id)">
                            <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      }
                    </div>
                  }

                  <!-- Inline form for adding a mini-goal to this milestone (shown when toggled) -->
                  @if (activeMiniForm === m.id) {
                    <div class="mini-add-form">
                      <!-- Text input with Enter key binding for quick addition -->
                      <input class="input mini-input" [(ngModel)]="miniGoalTitle" placeholder="Mini-goal title..." (keydown.enter)="addMiniGoal(m.id)" />
                      <button class="btn-primary mini-btn" (click)="addMiniGoal(m.id)" [disabled]="!miniGoalTitle.trim() || addingMini">
                        {{ addingMini ? 'Adding...' : 'Add' }}
                      </button>
                    </div>
                  }
                </div>
              } @empty {
                <!-- Empty state: no milestones have been added yet -->
                <p class="no-milestones">No milestones yet. Add one above!</p>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>

    <app-confirm-dialog
      [isOpen]="deleteConfirmOpen"
      title="Delete Milestone"
      [message]="'Delete &quot;' + deletingMilestoneTitle + '&quot; and its mini-goals? This cannot be undone.'"
      confirmText="Delete"
      (confirmed)="confirmDeleteMilestone()"
      (cancelled)="deleteConfirmOpen = false"
    />
  `,
  styles: [`
    /* Back link styled as an accent-colored text link */
    .back-link { color: var(--accent); text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { text-decoration: underline; }
    /* Detail layout: vertical flex with spacing between cards */
    .goal-detail { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
    /* Header card: padded with spacing between sections */
    .goal-header-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .goal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .goal-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.375rem; color: var(--text-primary); }
    .goal-desc { color: var(--text-secondary); margin: 0; font-size: 0.9rem; }
    .target-date { color: var(--text-muted); font-size: 0.8rem; margin: 0.25rem 0 0; }
    /* Status badge: pill-shaped with accent colors */
    .goal-status-badge { font-size: 0.75rem; padding: 0.25rem 0.625rem; border-radius: 9999px; background: var(--accent-light); color: var(--accent); font-weight: 500; white-space: nowrap; }
    /* Progress bar section */
    .progress-section { display: flex; flex-direction: column; gap: 0.375rem; }
    .progress-header { display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary); }
    .progress-track { height: 8px; background: var(--bg-secondary); border-radius: 9999px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--accent); border-radius: 9999px; transition: width 0.4s ease; }
    /* Milestones card */
    .milestones-card { padding: 1.25rem; }
    .milestones-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .milestones-header h2 { font-size: 1rem; font-weight: 600; margin: 0; color: var(--text-primary); }
    /* Small button variant */
    .sm { font-size: 0.8rem; padding: 0.375rem 0.75rem; }
    /* Milestone add form: horizontal layout with background */
    .milestone-form { display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem; margin-bottom: 1rem; background: var(--bg-secondary); border-radius: 8px; flex-wrap: wrap; }
    .milestone-list { display: flex; flex-direction: column; gap: 2px; }

    /* Milestone block: left border creates a visual tree structure */
    .milestone-block { border-left: 2px solid var(--border); margin-left: 10px; padding-left: 0; }
    /* Milestone row: horizontal flex with checkbox, title, actions */
    .milestone-row { display: flex; align-items: center; gap: 0.625rem; padding: 0.625rem 0.5rem; border-radius: 0.375rem; }
    .milestone-row:hover { background: var(--bg-hover); }
    /* Completed milestone: strikethrough title and muted color */
    .milestone-row.completed .milestone-title { text-decoration: line-through; color: var(--text-muted); }
    /* Circular checkbox button for milestone completion */
    .milestone-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; color: var(--green); }
    .milestone-check:not(:disabled):hover { border-color: var(--accent); }
    /* Completed milestone checkbox: filled green with white checkmark */
    .milestone-row.completed .milestone-check { background: var(--green); border-color: var(--green); color: white; }
    .milestone-title { flex: 1; font-size: 0.875rem; color: var(--text-primary); }
    .milestone-due { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
    /* Icon buttons for add/delete actions */
    .icon-btn { background: transparent; border: none; padding: 0.25rem; border-radius: 0.25rem; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
    .icon-btn.danger:hover { color: var(--red); }
    .no-milestones { color: var(--text-muted); font-size: 0.875rem; padding: 1rem; text-align: center; }
    .loading { text-align: center; padding: 3rem; color: var(--text-muted); }

    /* Mini-goals: indented beneath their parent milestone */
    .mini-goals { padding: 2px 0 4px 32px; }
    /* Mini-goal row: small checkbox + title + delete button */
    .mini-goal-row {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 8px; border-radius: 6px; transition: background 0.1s;
    }
    .mini-goal-row:hover { background: var(--bg-hover); }
    /* Done mini-goals: strikethrough + muted */
    .mini-goal-row.done .mini-title { text-decoration: line-through; color: var(--text-muted); }
    /* Small square checkbox for mini-goals */
    .mini-check {
      width: 16px; height: 16px; border-radius: 4px;
      border: 1.5px solid var(--border); background: transparent;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.15s; color: var(--green);
    }
    .mini-check:hover { border-color: var(--accent); }
    /* Completed mini-goal checkbox: filled green with white checkmark */
    .mini-goal-row.done .mini-check { background: var(--green); border-color: var(--green); color: white; }
    .mini-title { flex: 1; font-size: 0.8rem; color: var(--text-primary); }
    /* Delete button for mini-goals: hidden by default, shown on hover */
    .mini-del { opacity: 0; }
    .mini-goal-row:hover .mini-del { opacity: 1; }

    /* Inline form for adding a new mini-goal */
    .mini-add-form {
      display: flex; gap: 6px; padding: 6px 8px 6px 32px;
    }
    .mini-input { font-size: 0.82rem; padding: 6px 10px; }
    .mini-btn { font-size: 0.78rem; padding: 6px 12px; }
  `],
})
export class GoalDetailComponent implements OnInit {
  // Inject dependencies
  private route = inject(ActivatedRoute); // For reading the :id route parameter
  private router = inject(Router); // For redirecting on error (goal not found)
  private goalService = inject(GoalService); // For all goal/milestone/mini-goal API operations
  private toast = inject(ToastService); // For success/error feedback
  private fb = inject(FormBuilder); // For creating the milestone form

  // Reactive signal holding the loaded goal data (null until fetched)
  goal = signal<Goal | null>(null);
  // Controls visibility of the add milestone form
  showAddForm = false;
  // Tracks which milestone's mini-goal add form is currently visible (null = none)
  activeMiniForm: string | null = null;
  // Two-way bound mini-goal title input value
  miniGoalTitle = '';

  // Reactive form for adding a new milestone (title required, dueDate optional)
  milestoneForm = this.fb.group({
    title: ['', Validators.required],
    dueDate: [''],
  });

  // On init, read the goal ID from the URL and fetch the full goal with milestones/mini-goals
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!; // Extract :id from /goals/:id
    this.goalService.getOne(id).subscribe({
      next: (g) => this.goal.set(g), // Store the goal in the signal
      error: () => this.router.navigate(['/goals']), // If not found, go back to the list
    });
  }

  addingMilestone = false;

  addMilestone() {
    if (this.milestoneForm.invalid || this.addingMilestone) return;
    this.addingMilestone = true;
    const v = this.milestoneForm.value;
    this.goalService.addMilestone(this.goal()!.id, { title: v.title!, dueDate: v.dueDate || undefined }).subscribe({
      next: (g) => { this.goal.set(g); this.milestoneForm.reset(); this.showAddForm = false; this.addingMilestone = false; },
      error: () => { this.toast.error('Failed to add milestone'); this.addingMilestone = false; },
    });
  }

  loadingMilestones = new Set<string>();

  completeMilestone(m: GoalMilestone) {
    if (this.loadingMilestone) return;
    this.loadingMilestone = m.id;

    const wasCompleted = m.status === 'COMPLETED';
    const newStatus = wasCompleted ? 'PENDING' : 'COMPLETED';

    // Instant UI: toggle checkbox + recalculate progress bar immediately
    this.goal.update((g) => {
      if (!g) return g;
      const milestones = g.milestones.map((ms) =>
        ms.id === m.id
          ? { ...ms, status: newStatus as any, completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null }
          : ms
      );
      const done = milestones.filter((ms) => ms.status === 'COMPLETED').length;
      return { ...g, milestones, progress: milestones.length > 0 ? (done / milestones.length) * 100 : 0 };
    });

    // Sync with backend
    this.goalService.completeMilestone(this.goal()!.id, m.id).subscribe({
      next: (g) => { this.goal.set(g); this.loadingMilestone = null; },
      error: () => {
        // Revert everything on error
        this.goalService.getOne(this.goal()!.id).subscribe({
          next: (g) => { this.goal.set(g); this.loadingMilestone = null; },
          error: () => { this.loadingMilestone = null; },
        });
        this.toast.error('Failed to update');
      },
    });
  }

  // Delete milestone — confirm dialog
  deleteConfirmOpen = false;
  deletingMilestoneId = '';
  deletingMilestoneTitle = '';

  showDeleteMilestone(m: GoalMilestone) {
    this.deletingMilestoneId = m.id;
    this.deletingMilestoneTitle = m.title;
    this.deleteConfirmOpen = true;
  }

  confirmDeleteMilestone() {
    this.deleteConfirmOpen = false;
    this.goalService.deleteMilestone(this.goal()!.id, this.deletingMilestoneId).subscribe({
      next: () => {
        this.goal.update((g) => g ? { ...g, milestones: g.milestones.filter((m) => m.id !== this.deletingMilestoneId) } : g);
        this.toast.success('Milestone deleted');
      },
      error: () => this.toast.error('Failed to delete milestone'),
    });
  }

  toggleMiniForm(milestoneId: string) {
    this.activeMiniForm = this.activeMiniForm === milestoneId ? null : milestoneId;
    this.miniGoalTitle = '';
  }

  addingMini = false;

  addMiniGoal(milestoneId: string) {
    if (!this.miniGoalTitle.trim() || this.addingMini) return;
    this.addingMini = true;
    this.goalService.addMiniGoal(this.goal()!.id, milestoneId, this.miniGoalTitle.trim()).subscribe({
      next: (g) => { this.goal.set(g); this.miniGoalTitle = ''; this.activeMiniForm = null; this.addingMini = false; },
      error: () => { this.toast.error('Failed to add mini-goal'); this.addingMini = false; },
    });
  }

  // Toggle a mini-goal between PENDING and COMPLETED
  loadingMiniGoal: string | null = null;

  toggleMiniGoal(miniGoalId: string) {
    if (this.loadingMiniGoal) return; // Prevent double-click
    this.loadingMiniGoal = miniGoalId;
    this.goalService.toggleMiniGoal(this.goal()!.id, miniGoalId).subscribe({
      next: (g) => { this.goal.set(g); this.loadingMiniGoal = null; },
      error: () => { this.toast.error('Failed to update'); this.loadingMiniGoal = null; },
    });
  }

  // Remove a mini-goal from a milestone
  removeMiniGoal(miniGoalId: string) {
    this.goalService.removeMiniGoal(this.goal()!.id, miniGoalId).subscribe({
      next: (g) => this.goal.set(g), // Update the goal signal with recalculated progress
      error: () => this.toast.error('Failed to remove mini-goal'),
    });
  }
}
