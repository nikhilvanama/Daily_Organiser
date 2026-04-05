import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TaskService } from '../task.service';
import { ToastService } from '../../../core/services/toast.service';
import { Task, PLAN_TYPES } from '../../../core/models/task.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, ModalComponent, TaskFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page animate-in">
      <a routerLink="/tasks" class="back-link">← Back to My Plans</a>

      @if (task()) {
        <div class="detail card">
          <!-- Type + Status Header -->
          <div class="detail-top">
            <span class="type-chip" [style.background]="getColor() + '18'" [style.color]="getColor()">
              {{ getIcon() }} {{ getLabel() }}
            </span>
            <span class="badge badge-{{ task()!.priority.toLowerCase() }}">{{ task()!.priority }}</span>
            <span class="badge badge-{{ task()!.status.toLowerCase().replace('_', '-') }}">{{ task()!.status.replace('_', ' ') }}</span>
            @if (task()!.category) {
              <span class="cat-tag" [style.color]="task()!.category!.color">{{ task()!.category!.name }}</span>
            }
          </div>

          <!-- Title + Actions -->
          <div class="title-row">
            <h1 [class.done]="task()!.status === 'DONE'">{{ task()!.title }}</h1>
            <div class="detail-actions">
              <button class="btn-ghost action-btn" (click)="showEdit = true">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="btn-del action-btn" (click)="showDeleteConfirm = true">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                Delete
              </button>
            </div>
          </div>

          <!-- Description -->
          @if (task()!.description) {
            <p class="desc">{{ task()!.description }}</p>
          }

          <!-- Info Grid -->
          <div class="info-grid">
            @if (task()!.dueDate) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div>
                  <span class="info-label">Date</span>
                  <span class="info-value">{{ task()!.dueDate | date:'EEEE, MMM d, y' }}</span>
                </div>
              </div>
            }
            @if (task()!.endDate) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div>
                  <span class="info-label">End Date</span>
                  <span class="info-value">{{ task()!.endDate | date:'EEEE, MMM d, y' }}</span>
                </div>
              </div>
            }
            @if (task()!.departureTime) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div>
                  <span class="info-label">{{ task()!.endTime ? 'Departure → Arrival' : 'Departure' }}</span>
                  <span class="info-value">{{ task()!.departureTime }}{{ task()!.endTime ? ' → ' + task()!.endTime : '' }}</span>
                </div>
              </div>
            } @else if (task()!.startTime || task()!.endTime) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div>
                  <span class="info-label">Time</span>
                  <span class="info-value">{{ task()!.startTime ?? '' }}{{ task()!.endTime ? ' → ' + task()!.endTime : '' }}</span>
                </div>
              </div>
            }
            @if (task()!.location) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div>
                  <span class="info-label">Location</span>
                  <span class="info-value">{{ task()!.location }}</span>
                </div>
              </div>
            }
            @if (task()!.boardingStation) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div>
                  <span class="info-label">Boarding</span>
                  <span class="info-value">{{ task()!.boardingStation }}</span>
                </div>
              </div>
            }
            @if (task()!.destinationStation) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div>
                  <span class="info-label">Destination</span>
                  <span class="info-value">{{ task()!.destinationStation }}</span>
                </div>
              </div>
            }
            @if (task()!.trainNumber) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="18" x2="6" y2="22"/><line x1="18" y1="18" x2="18" y2="22"/></svg>
                <div>
                  <span class="info-label">Travel Type</span>
                  <span class="info-value">{{ task()!.trainNumber }}</span>
                </div>
              </div>
            }
            @if (task()!.meetingLink) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                <div>
                  <span class="info-label">Meeting Link</span>
                  <a class="info-link" [href]="task()!.meetingLink" target="_blank">{{ task()!.meetingLink }}</a>
                </div>
              </div>
            }
            <div class="info-item">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div>
                <span class="info-label">Created</span>
                <span class="info-value">{{ task()!.createdAt | date:'MMM d, y · h:mm a' }}</span>
              </div>
            </div>
          </div>

          @if (task()!.googleEventId) {
            <div class="gcal-badge">
              <svg width="14" height="14" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              Synced to Google Calendar
            </div>
          }
        </div>
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>

    <app-modal [isOpen]="showEdit" title="Edit Plan" (close)="showEdit = false" maxWidth="560px">
      <app-task-form [task]="task()" (saved)="onEdited()" (cancelled)="showEdit = false" />
    </app-modal>

    <app-confirm-dialog
      [isOpen]="showDeleteConfirm"
      title="Delete Plan"
      [message]="'Delete &quot;' + (task()?.title ?? '') + '&quot;? This cannot be undone.'"
      confirmText="Delete"
      (confirmed)="onDelete()"
      (cancelled)="showDeleteConfirm = false"
    />
  `,
  styles: [`
    .back-link { color: var(--accent); text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { text-decoration: underline; }

    .detail { padding: 2rem; margin-top: 1rem; display: flex; flex-direction: column; gap: 1.25rem; }

    .detail-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .type-chip { font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; }
    .cat-tag { font-size: 0.8rem; font-weight: 500; }

    h1 { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    h1.done { text-decoration: line-through; color: var(--text-muted); }
    .desc { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0; }

    .info-grid { display: flex; flex-direction: column; gap: 2px; background: var(--bg-secondary); border-radius: 12px; padding: 4px; }
    .info-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      color: var(--text-secondary);
    }
    .info-item:hover { background: var(--bg-hover); }
    .info-item svg { flex-shrink: 0; color: var(--text-muted); }
    .info-item > div { display: flex; flex-direction: column; gap: 1px; }
    .info-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .info-value { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); }
    .info-link { font-size: 0.85rem; color: var(--accent); word-break: break-all; }
    .info-link:hover { text-decoration: underline; }

    .gcal-badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.78rem; color: var(--accent); font-weight: 500;
      padding: 8px 14px; background: var(--accent-subtle);
      border-radius: 8px; width: fit-content;
    }

    .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .title-row h1 { flex: 1; }
    .detail-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .action-btn { font-size: 0.82rem; padding: 8px 14px; gap: 6px; }
    .btn-del {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: transparent; color: var(--text-muted); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 8px 14px; font-size: 0.82rem;
      font-family: inherit; font-weight: 500; cursor: pointer; transition: all 0.15s;
    }
    .btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

    .loading { text-align: center; padding: 3rem; color: var(--text-muted); }
  `],
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private toast = inject(ToastService);

  task = signal<Task | null>(null);
  planTypes = PLAN_TYPES;
  showEdit = false;
  showDeleteConfirm = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.taskService.getOne(id).subscribe({
      next: (t) => this.task.set(t),
      error: () => this.router.navigate(['/tasks']),
    });
  }

  onEdited() {
    this.showEdit = false;
    this.toast.success('Plan updated');
    // Reload the task to show updated data
    this.taskService.getOne(this.task()!.id).subscribe({
      next: (t) => this.task.set(t),
    });
  }

  onDelete() {
    this.showDeleteConfirm = false;
    this.taskService.delete(this.task()!.id).subscribe({
      next: () => {
        this.toast.success('Plan deleted');
        this.router.navigate(['/tasks']);
      },
    });
  }

  getColor() { return this.planTypes.find((t) => t.value === this.task()?.type)?.color ?? '#3b82f6'; }
  getIcon() { return this.planTypes.find((t) => t.value === this.task()?.type)?.icon ?? '✓'; }
  getLabel() { return this.planTypes.find((t) => t.value === this.task()?.type)?.label ?? 'Task'; }
}
