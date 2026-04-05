import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TaskService } from '../task.service';
import { Task, PLAN_TYPES } from '../../../core/models/task.model';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
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

          <!-- Title -->
          <h1 [class.done]="task()!.status === 'DONE'">{{ task()!.title }}</h1>

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
            @if (task()!.startTime || task()!.endTime) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div>
                  <span class="info-label">Time</span>
                  <span class="info-value">{{ task()!.startTime ?? '—' }} {{ task()!.endTime ? '→ ' + task()!.endTime : '' }}</span>
                </div>
              </div>
            }
            @if (task()!.departureTime) {
              <div class="info-item">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div>
                  <span class="info-label">Departure</span>
                  <span class="info-value">{{ task()!.departureTime }}</span>
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
                  <span class="info-label">Train</span>
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

    .loading { text-align: center; padding: 3rem; color: var(--text-muted); }
  `],
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);

  task = signal<Task | null>(null);
  planTypes = PLAN_TYPES;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.taskService.getOne(id).subscribe({
      next: (t) => this.task.set(t),
      error: () => this.router.navigate(['/tasks']),
    });
  }

  getColor() { return this.planTypes.find((t) => t.value === this.task()?.type)?.color ?? '#3b82f6'; }
  getIcon() { return this.planTypes.find((t) => t.value === this.task()?.type)?.icon ?? '✓'; }
  getLabel() { return this.planTypes.find((t) => t.value === this.task()?.type)?.label ?? 'Task'; }
}
