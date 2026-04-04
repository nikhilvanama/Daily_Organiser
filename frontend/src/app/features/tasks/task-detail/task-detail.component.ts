// Import Angular core utilities: Component, inject for DI, OnDestroy for cleanup, OnInit lifecycle, signal for reactive state
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
// ActivatedRoute reads the :id param from the URL; Router for navigation; RouterLink for the back link
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
// DatePipe formats dates in the template
import { DatePipe } from '@angular/common';
// TaskService provides getOne(), startTimer(), and stopTimer() methods
import { TaskService } from '../task.service';
// ToastService shows error feedback for timer operations
import { ToastService } from '../../../core/services/toast.service';
// Task model interface for typing the task signal
import { Task } from '../../../core/models/task.model';

// TaskDetailComponent shows the full details of a single task/plan, including:
// title, description, priority/status badges, category, stats (due date, estimated/tracked time),
// and a built-in timer for time tracking. The timer counts up in real-time while active.
@Component({
  selector: 'app-task-detail', // Loaded by the router at /tasks/:id
  standalone: true, // Angular 19 standalone component
  imports: [RouterLink, DatePipe], // Enable router links and date formatting
  template: `
    <!-- Page container with fade-in animation -->
    <div class="page animate-in">
      <!-- Back navigation link to the tasks list -->
      <a routerLink="/tasks" class="back-link">← Back to Tasks</a>

      <!-- Task detail card: only shown once the task data is loaded -->
      @if (task()) {
        <div class="task-detail card">
          <!-- Header section: badges (priority, status, category) + title + description -->
          <div class="task-detail-header">
            <div class="task-meta">
              <!-- Priority badge: color-coded (HIGH=red, MEDIUM=amber, LOW=green) -->
              <span class="badge badge-{{ task()!.priority.toLowerCase() }}">{{ task()!.priority }}</span>
              <!-- Status badge: color varies by status (TODO, IN_PROGRESS, DONE, CANCELLED) -->
              <span class="badge badge-{{ task()!.status.toLowerCase().replace('_', '-') }}">{{ task()!.status }}</span>
              <!-- Category name in the category's assigned color (if assigned) -->
              @if (task()!.category) {
                <span class="task-category" [style.color]="task()!.category!.color">{{ task()!.category!.name }}</span>
              }
            </div>
            <!-- Task title: strikethrough styling when status is DONE -->
            <h1 class="task-title" [class.done]="task()!.status === 'DONE'">{{ task()!.title }}</h1>
            <!-- Optional description text -->
            @if (task()!.description) {
              <p class="task-description">{{ task()!.description }}</p>
            }
          </div>

          <!-- Stats grid: due date, estimated time, tracked time, created date -->
          <div class="task-stats">
            <div class="task-stat">
              <span class="stat-label">Due Date</span>
              <span>{{ task()!.dueDate ? (task()!.dueDate | date:'MMM d, y') : 'No due date' }}</span>
            </div>
            <div class="task-stat">
              <span class="stat-label">Estimated</span>
              <span>{{ task()!.estimatedMins ? formatTime(task()!.estimatedMins!) : '—' }}</span>
            </div>
            <div class="task-stat">
              <span class="stat-label">Tracked</span>
              <span>{{ formatTime(task()!.trackedMins) }}</span>
            </div>
            <div class="task-stat">
              <span class="stat-label">Created</span>
              <span>{{ task()!.createdAt | date:'MMM d, y' }}</span>
            </div>
          </div>

          <!-- Timer section: live elapsed time display + start/stop controls -->
          <div class="timer-section">
            <div class="timer-display">
              <!-- Clock icon -->
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <!-- Live timer value (H:MM:SS format), updated every second while active -->
              <span class="timer-value">{{ timerDisplay() }}</span>
            </div>
            <div class="timer-controls">
              <!-- Show Start button when timer is not active -->
              @if (!task()!.isTimerActive) {
                <button class="btn-primary" (click)="startTimer()">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Start Timer
                </button>
              } @else {
                <!-- Show Stop button when timer is running -->
                <button class="btn-danger" (click)="stopTimer()">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  Stop Timer
                </button>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Loading state while the task is being fetched -->
        <div class="loading">Loading…</div>
      }
    </div>
  `,
  styles: [`
    /* Back link styled as an accent-colored text link */
    .back-link { color: var(--accent); text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { text-decoration: underline; }
    /* Detail card: vertical flex layout with spacing between sections */
    .task-detail { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1rem; }
    .task-detail-header { display: flex; flex-direction: column; gap: 0.75rem; }
    /* Badges row: wrapping flex container */
    .task-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    /* Title: large bold text, strikethrough + muted color when done */
    .task-title { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .task-title.done { text-decoration: line-through; color: var(--text-muted); }
    .task-description { color: var(--text-secondary); margin: 0; line-height: 1.6; }
    .task-category { font-size: 0.8rem; font-weight: 500; }
    /* Stats grid: responsive auto-fit columns */
    .task-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; }
    .task-stat { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: var(--text-primary); }
    /* Stat label: small uppercase text */
    .stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; }
    /* Timer section: flex row with display on the left and controls on the right */
    .timer-section { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; }
    .timer-display { display: flex; align-items: center; gap: 0.625rem; }
    /* Timer value: large monospace-style numbers for readability */
    .timer-value { font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-primary); }
    .timer-controls { display: flex; gap: 0.5rem; }
    /* Danger button for stopping the timer (red background) */
    .btn-danger { background: var(--red); color: white; border-radius: var(--radius-sm); padding: 0.5rem 1rem; font-weight: 500; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 0.375rem; }
    .loading { text-align: center; padding: 3rem; color: var(--text-muted); }
  `],
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  // Inject dependencies
  private route = inject(ActivatedRoute); // For reading the :id route parameter
  private router = inject(Router); // For redirecting on error (task not found)
  private taskService = inject(TaskService); // For fetching task data and timer operations
  private toast = inject(ToastService); // For error feedback on timer operations

  // Reactive signal holding the loaded task data (null until fetched)
  task = signal<Task | null>(null);
  // Reactive signal holding the formatted timer display string (H:MM:SS)
  timerDisplay = signal('0:00:00');
  // Reference to the setInterval timer so it can be cleared on destroy or stop
  private timerInterval: any;

  // On init, read the task ID from the URL and fetch the full task from the backend
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!; // Extract :id from /tasks/:id
    this.taskService.getOne(id).subscribe({
      next: (t) => {
        this.task.set(t); // Store the task in the signal
        // If the timer was already running (started in a previous session), resume the display timer
        if (t.isTimerActive) this.startDisplayTimer();
      },
      error: () => this.router.navigate(['/tasks']), // If task not found, go back to the list
    });
  }

  // Clean up the interval timer when the component is destroyed to prevent memory leaks
  ngOnDestroy() { clearInterval(this.timerInterval); }

  // Start the task timer via the backend API, then begin the UI counter
  startTimer() {
    this.taskService.startTimer(this.task()!.id).subscribe({
      next: (t) => { this.task.set(t); this.startDisplayTimer(); }, // Update task and start counting
      error: () => this.toast.error('Failed to start timer'),
    });
  }

  // Stop the task timer via the backend API, then reset the UI counter
  stopTimer() {
    this.taskService.stopTimer(this.task()!.id).subscribe({
      next: (t) => { this.task.set(t); clearInterval(this.timerInterval); this.timerDisplay.set('0:00:00'); },
      error: () => this.toast.error('Failed to stop timer'),
    });
  }

  // Start a client-side interval that updates the timer display every second.
  // Uses the server-provided timerStartAt timestamp to calculate elapsed time.
  private startDisplayTimer() {
    const start = this.task()!.timerStartAt ? new Date(this.task()!.timerStartAt!).getTime() : Date.now();
    clearInterval(this.timerInterval); // Clear any existing interval before starting a new one
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000); // Total seconds elapsed
      const h = Math.floor(elapsed / 3600); // Hours
      const m = Math.floor((elapsed % 3600) / 60); // Minutes
      const s = elapsed % 60; // Seconds
      // Format as H:MM:SS with zero-padded minutes and seconds
      this.timerDisplay.set(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000); // Update every second
  }

  // Utility method to format minutes into a human-readable "Xh Ym" string
  formatTime(mins: number): string { return `${Math.floor(mins / 60)}h ${mins % 60}m`; }
}
