import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoalService } from '../goal.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Goal, GoalMilestone } from '../../../core/models/goal.model';

@Component({
  selector: 'app-goal-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule, FormsModule, ConfirmDialogComponent],
  template: `
    <div class="page animate-in">
      <a routerLink="/goals" class="back-link">← Back to Goals</a>

      @if (goal()) {
        <div class="goal-detail">
          <!-- Header Card -->
          <div class="card goal-header-card">
            <div class="goal-header">
              <div>
                <h1>{{ goal()!.title }}</h1>
                @if (goal()!.description) { <p class="goal-desc">{{ goal()!.description }}</p> }
                @if (goal()!.targetDate) {
                  <p class="target-date">Target: {{ goal()!.targetDate | date:'MMM d, y' }}</p>
                }
              </div>
              <span class="badge goal-status-badge">{{ goal()!.status }}</span>
            </div>
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

          <!-- Resources Card -->
          @if (goal()!.resources && goal()!.resources.length > 0) {
            <div class="card resources-card">
              <h2>Resources</h2>
              <div class="resources-list">
                @for (res of goal()!.resources; track $index) {
                  <div class="resource-item">
                    @if (isUrl(res)) {
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                      <a [href]="res" target="_blank" rel="noopener noreferrer">{{ res }}</a>
                    } @else {
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>{{ res }}</span>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Milestones Card -->
          <div class="card milestones-card">
            <div class="milestones-header">
              <h2>Milestones</h2>
              <button class="btn-ghost sm" (click)="showAddForm = !showAddForm">
                {{ showAddForm ? 'Cancel' : '+ Add Milestone' }}
              </button>
            </div>

            @if (showAddForm) {
              <form [formGroup]="milestoneForm" (ngSubmit)="addMilestone()" class="milestone-form">
                <input class="input" formControlName="title" placeholder="Milestone title" />
                <input class="input" type="date" formControlName="dueDate" />
                <button class="btn-primary sm" type="submit" [disabled]="milestoneForm.invalid || addingMilestone">
                  {{ addingMilestone ? 'Adding...' : 'Add' }}
                </button>
              </form>
            }

            <div class="milestone-list">
              @for (m of goal()!.milestones; track m.id; let i = $index) {
                <div class="milestone-block"
                     [class.dragging]="dragIndex === i"
                     [class.drag-over]="dragOverIndex === i"
                     draggable="true"
                     (dragstart)="onDragStart(i, $event)"
                     (dragover)="onDragOver(i, $event)"
                     (dragenter)="onDragEnter(i, $event)"
                     (dragleave)="onDragLeave($event)"
                     (drop)="onDrop(i, $event)"
                     (dragend)="onDragEnd()">
                  <!-- Accordion Header -->
                  <div class="milestone-row" [class.completed]="m.status === 'COMPLETED'">
                    <!-- Drag handle -->
                    <span class="drag-handle" title="Drag to reorder">
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                    </span>

                    <button class="milestone-check" (click)="completeMilestone(m)">
                      @if (m.status === 'COMPLETED') {
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </button>

                    <!-- Clickable title area to expand/collapse -->
                    <button class="accordion-toggle" (click)="toggleAccordion(m.id)">
                      <svg class="chevron" [class.expanded]="expandedMilestones.has(m.id)" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                      <span class="milestone-title">{{ m.title }}</span>
                    </button>

                    @if (m.dueDate) {
                      <span class="milestone-due">{{ m.dueDate | date:'MMM d' }}</span>
                    }

                    <!-- Edit milestone -->
                    <button class="icon-btn" (click)="startEditMilestone(m); $event.stopPropagation()" title="Edit">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>

                    <!-- Add mini-goal -->
                    <button class="icon-btn" (click)="toggleMiniForm(m.id)" title="Add mini-goal">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>

                    <!-- Delete milestone -->
                    <button class="icon-btn danger" (click)="showDeleteMilestone(m)">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  <!-- Edit Milestone Inline Form -->
                  @if (editingMilestoneId === m.id) {
                    <div class="milestone-edit-form">
                      <input class="input" [(ngModel)]="editMilestoneTitle" placeholder="Milestone title" />
                      <input class="input" type="date" [(ngModel)]="editMilestoneDueDate" />
                      <button class="btn-primary sm" (click)="saveEditMilestone()" [disabled]="!editMilestoneTitle.trim() || savingMilestone">
                        {{ savingMilestone ? 'Saving...' : 'Save' }}
                      </button>
                      <button class="btn-ghost sm" (click)="editingMilestoneId = null">Cancel</button>
                    </div>
                  }

                  <!-- Accordion Body: mini-goals + add form (collapsible) -->
                  @if (expandedMilestones.has(m.id)) {
                    @if (m.miniGoals && m.miniGoals.length > 0) {
                      <div class="mini-goals">
                        @for (mg of m.miniGoals; track mg.id) {
                          <div class="mini-goal-row" [class.done]="mg.status === 'COMPLETED'">
                            <button class="mini-check" (click)="toggleMiniGoal(mg.id)">
                              @if (mg.status === 'COMPLETED') {
                                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                              }
                            </button>
                            <span class="mini-title">{{ mg.title }}</span>
                            <button class="icon-btn mini-del danger" (click)="removeMiniGoal(mg.id)">
                              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        }
                      </div>
                    }

                    @if (activeMiniForm === m.id) {
                      <div class="mini-add-form">
                        <input class="input mini-input" [(ngModel)]="miniGoalTitle" placeholder="Mini-goal title..." (keydown.enter)="addMiniGoal(m.id)" />
                        <button class="btn-primary mini-btn" (click)="addMiniGoal(m.id)" [disabled]="!miniGoalTitle.trim() || addingMini">
                          {{ addingMini ? 'Adding...' : 'Add' }}
                        </button>
                      </div>
                    }

                    @if (!m.miniGoals.length && activeMiniForm !== m.id) {
                      <p class="no-mini-goals">No mini-goals yet</p>
                    }
                  }
                </div>
              } @empty {
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
    .back-link { color: var(--accent); text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { text-decoration: underline; }
    .goal-detail { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
    .goal-header-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .goal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .goal-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.375rem; color: var(--text-primary); }
    .goal-desc { color: var(--text-secondary); margin: 0; font-size: 0.9rem; }
    .target-date { color: var(--text-muted); font-size: 0.8rem; margin: 0.25rem 0 0; }
    .goal-status-badge { font-size: 0.75rem; padding: 0.25rem 0.625rem; border-radius: 9999px; background: var(--accent-light); color: var(--accent); font-weight: 500; white-space: nowrap; }
    .progress-section { display: flex; flex-direction: column; gap: 0.375rem; }
    .progress-header { display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary); }
    .progress-track { height: 8px; background: var(--bg-secondary); border-radius: 9999px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--accent); border-radius: 9999px; transition: width 0.4s ease; }

    /* Resources */
    .resources-card { padding: 1.25rem; }
    .resources-card h2 { font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem; color: var(--text-primary); }
    .resources-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .resource-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--text-secondary); }
    .resource-item a { color: var(--accent); text-decoration: none; word-break: break-all; }
    .resource-item a:hover { text-decoration: underline; }
    .resource-item svg { flex-shrink: 0; color: var(--text-muted); }

    /* Milestones */
    .milestones-card { padding: 1.25rem; }
    .milestones-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .milestones-header h2 { font-size: 1rem; font-weight: 600; margin: 0; color: var(--text-primary); }
    .sm { font-size: 0.8rem; padding: 0.375rem 0.75rem; }
    .milestone-form { display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem; margin-bottom: 1rem; background: var(--bg-secondary); border-radius: 8px; flex-wrap: wrap; }
    .milestone-list { display: flex; flex-direction: column; gap: 2px; }
    .milestone-block { border-left: 2px solid var(--border); margin-left: 10px; padding-left: 0; transition: opacity 0.15s, transform 0.15s; }
    .milestone-block.dragging { opacity: 0.4; }
    .milestone-block.drag-over { border-top: 2px solid var(--accent); }

    /* Drag handle */
    .drag-handle { display: flex; align-items: center; cursor: grab; color: var(--text-muted); padding: 0 2px; flex-shrink: 0; opacity: 0.4; transition: opacity 0.15s; }
    .milestone-row:hover .drag-handle { opacity: 1; }
    .drag-handle:active { cursor: grabbing; }

    /* Milestone row / accordion header */
    .milestone-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 0.5rem; border-radius: 0.375rem; }
    .milestone-row:hover { background: var(--bg-hover); }
    .milestone-row.completed .milestone-title { text-decoration: line-through; color: var(--text-muted); }
    .milestone-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; color: var(--green); }
    .milestone-check:not(:disabled):hover { border-color: var(--accent); }
    .milestone-row.completed .milestone-check { background: var(--green); border-color: var(--green); color: white; }

    /* Accordion toggle button */
    .accordion-toggle { display: flex; align-items: center; gap: 0.375rem; background: none; border: none; cursor: pointer; flex: 1; text-align: left; padding: 0; color: inherit; }
    .chevron { transition: transform 0.2s ease; flex-shrink: 0; color: var(--text-muted); }
    .chevron.expanded { transform: rotate(180deg); }
    .milestone-title { font-size: 0.875rem; color: var(--text-primary); }
    .milestone-due { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }

    /* Icon buttons */
    .icon-btn { background: transparent; border: none; padding: 0.25rem; border-radius: 0.25rem; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
    .icon-btn.danger:hover { color: var(--red); }

    /* Edit milestone form */
    .milestone-edit-form { display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem 0.5rem 0.5rem 2rem; flex-wrap: wrap; background: var(--bg-secondary); border-radius: 6px; margin: 2px 0; }

    /* Mini-goals */
    .mini-goals { padding: 2px 0 4px 32px; }
    .mini-goal-row { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px; transition: background 0.1s; }
    .mini-goal-row:hover { background: var(--bg-hover); }
    .mini-goal-row.done .mini-title { text-decoration: line-through; color: var(--text-muted); }
    .mini-check { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; color: var(--green); }
    .mini-check:hover { border-color: var(--accent); }
    .mini-goal-row.done .mini-check { background: var(--green); border-color: var(--green); color: white; }
    .mini-title { flex: 1; font-size: 0.8rem; color: var(--text-primary); }
    .mini-del { opacity: 0; }
    .mini-goal-row:hover .mini-del { opacity: 1; }
    .mini-add-form { display: flex; gap: 6px; padding: 6px 8px 6px 32px; }
    .mini-input { font-size: 0.82rem; padding: 6px 10px; }
    .mini-btn { font-size: 0.78rem; padding: 6px 12px; }
    .no-milestones { color: var(--text-muted); font-size: 0.875rem; padding: 1rem; text-align: center; }
    .no-mini-goals { color: var(--text-muted); font-size: 0.8rem; padding: 0.375rem 0.5rem 0.375rem 2.5rem; margin: 0; }
    .loading { text-align: center; padding: 3rem; color: var(--text-muted); }
  `],
})
export class GoalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalService = inject(GoalService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  goal = signal<Goal | null>(null);
  showAddForm = false;
  activeMiniForm: string | null = null;
  miniGoalTitle = '';

  // Accordion state: set of expanded milestone IDs
  expandedMilestones = new Set<string>();

  // Milestone editing
  editingMilestoneId: string | null = null;
  editMilestoneTitle = '';
  editMilestoneDueDate = '';
  savingMilestone = false;

  milestoneForm = this.fb.group({
    title: ['', Validators.required],
    dueDate: [''],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.goalService.getOne(id).subscribe({
      next: (g) => {
        this.goal.set(g);
      },
      error: () => this.router.navigate(['/goals']),
    });
  }

  isUrl(str: string): boolean {
    return /^https?:\/\//i.test(str);
  }

  // Accordion toggle
  toggleAccordion(milestoneId: string) {
    if (this.expandedMilestones.has(milestoneId)) {
      this.expandedMilestones.delete(milestoneId);
    } else {
      this.expandedMilestones.add(milestoneId);
    }
  }

  // ── Milestone CRUD ──

  addingMilestone = false;

  addMilestone() {
    if (this.milestoneForm.invalid || this.addingMilestone) return;
    this.addingMilestone = true;
    const v = this.milestoneForm.value;
    this.goalService.addMilestone(this.goal()!.id, { title: v.title!, dueDate: v.dueDate || undefined }).subscribe({
      next: (g) => {
        this.goal.set(g);
        // Expand newly added milestone
        const newM = g.milestones[g.milestones.length - 1];
        if (newM) this.expandedMilestones.add(newM.id);
        this.milestoneForm.reset();
        this.showAddForm = false;
        this.addingMilestone = false;
      },
      error: () => { this.toast.error('Failed to add milestone'); this.addingMilestone = false; },
    });
  }

  startEditMilestone(m: GoalMilestone) {
    this.editingMilestoneId = m.id;
    this.editMilestoneTitle = m.title;
    this.editMilestoneDueDate = m.dueDate ? m.dueDate.split('T')[0] : '';
  }

  saveEditMilestone() {
    if (!this.editMilestoneTitle.trim() || this.savingMilestone) return;
    this.savingMilestone = true;
    const dto: any = { title: this.editMilestoneTitle.trim() };
    if (this.editMilestoneDueDate) dto.dueDate = this.editMilestoneDueDate;
    else dto.dueDate = null;

    this.goalService.updateMilestone(this.goal()!.id, this.editingMilestoneId!, dto).subscribe({
      next: (g) => {
        this.goal.set(g);
        this.editingMilestoneId = null;
        this.savingMilestone = false;
        this.toast.success('Milestone updated');
      },
      error: () => { this.toast.error('Failed to update milestone'); this.savingMilestone = false; },
    });
  }

  // ── Drag & drop reorder ──

  dragIndex: number | null = null;
  dragOverIndex: number | null = null;

  onDragStart(index: number, event: DragEvent) {
    this.dragIndex = index;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(index));
  }

  onDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDragEnter(index: number, event: DragEvent) {
    event.preventDefault();
    if (this.dragIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  onDragLeave(event: DragEvent) {
    const related = event.relatedTarget as HTMLElement;
    if (!related || !(event.currentTarget as HTMLElement).contains(related)) {
      this.dragOverIndex = null;
    }
  }

  onDrop(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    const fromIndex = this.dragIndex;
    this.dragIndex = null;
    this.dragOverIndex = null;

    if (fromIndex === null || fromIndex === targetIndex) return;

    const milestones = [...this.goal()!.milestones];
    const [moved] = milestones.splice(fromIndex, 1);
    milestones.splice(targetIndex, 0, moved);

    // Optimistic update
    this.goal.update(g => g ? { ...g, milestones } : g);

    // Persist
    const milestoneIds = milestones.map(m => m.id);
    this.goalService.reorderMilestones(this.goal()!.id, milestoneIds).subscribe({
      next: (g) => this.goal.set(g),
      error: () => this.toast.error('Failed to reorder'),
    });
  }

  onDragEnd() {
    this.dragIndex = null;
    this.dragOverIndex = null;
  }

  // ── Complete milestone ──

  loadingMilestones = new Set<string>();

  completeMilestone(m: GoalMilestone) {
    if (this.loadingMilestones.has(m.id)) return;
    this.loadingMilestones.add(m.id);

    const newStatus = m.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

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

    this.goalService.completeMilestone(this.goal()!.id, m.id).subscribe({
      next: (g) => { this.goal.set(g); this.loadingMilestones.delete(m.id); },
      error: () => {
        this.goalService.getOne(this.goal()!.id).subscribe({
          next: (g) => { this.goal.set(g); this.loadingMilestones.delete(m.id); },
          error: () => { this.loadingMilestones.delete(m.id); },
        });
        this.toast.error('Failed to update');
      },
    });
  }

  // ── Delete milestone ──

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
        this.expandedMilestones.delete(this.deletingMilestoneId);
        this.toast.success('Milestone deleted');
      },
      error: () => this.toast.error('Failed to delete milestone'),
    });
  }

  // ── Mini-goals ──

  toggleMiniForm(milestoneId: string) {
    this.activeMiniForm = this.activeMiniForm === milestoneId ? null : milestoneId;
    this.miniGoalTitle = '';
    // Ensure milestone is expanded when adding mini-goals
    if (this.activeMiniForm) this.expandedMilestones.add(milestoneId);
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

  loadingMiniGoal: string | null = null;

  toggleMiniGoal(miniGoalId: string) {
    if (this.loadingMiniGoal) return;
    this.loadingMiniGoal = miniGoalId;
    this.goalService.toggleMiniGoal(this.goal()!.id, miniGoalId).subscribe({
      next: (g) => { this.goal.set(g); this.loadingMiniGoal = null; },
      error: () => { this.toast.error('Failed to update'); this.loadingMiniGoal = null; },
    });
  }

  removeMiniGoal(miniGoalId: string) {
    this.goalService.removeMiniGoal(this.goal()!.id, miniGoalId).subscribe({
      next: (g) => this.goal.set(g),
      error: () => this.toast.error('Failed to remove mini-goal'),
    });
  }
}
