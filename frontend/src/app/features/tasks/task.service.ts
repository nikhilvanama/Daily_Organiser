// Import Injectable for DI registration as a singleton service
import { Injectable } from '@angular/core';
// HttpClient for making REST API calls; HttpParams for building query strings
import { HttpClient, HttpParams } from '@angular/common/http';
// tap operator performs side effects (updating the BehaviorSubject) without altering the stream
import { tap } from 'rxjs/operators';
// BehaviorSubject holds the latest task list and emits it to all subscribers
import { BehaviorSubject } from 'rxjs';
// Task-related type definitions and DTOs
import { Task, CreateTaskDto, UpdateTaskDto } from '../../core/models/task.model';
// Environment config provides the base API URL for constructing endpoints
import { environment } from '../../../environments/environment';

// TaskService handles all CRUD operations for tasks/plans and manages a local cache
// via a BehaviorSubject. Components subscribe to tasks$ to get reactive updates
// whenever the task list changes (after create, update, delete, or filter changes).
@Injectable({ providedIn: 'root' }) // Singleton — shared by task-list, task-form, task-detail, dashboard, calendar
export class TaskService {
  // Base URL for the tasks REST endpoints on the NestJS backend
  private readonly base = `${environment.apiUrl}/tasks`;
  // BehaviorSubject acting as a local cache of the task list — components subscribe to this
  // instead of making repeated HTTP calls. Updated after every mutation.
  tasks$ = new BehaviorSubject<Task[]>([]);

  constructor(private http: HttpClient) {} // Inject HttpClient for API communication

  // Fetch all tasks with optional filters (status, priority, type).
  // Query parameters are dynamically built from the filters object.
  // The result is cached in tasks$ so the task-list component auto-updates.
  loadAll(filters: Record<string, string> = {}) {
    let params = new HttpParams();
    // Add each non-empty filter as a query parameter (e.g., ?status=DONE&priority=HIGH)
    Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    return this.http.get<Task[]>(this.base, { params }).pipe(
      tap((tasks) => this.tasks$.next(tasks)), // Update the local cache with the server response
    );
  }

  // Fetch today's tasks — used by the dashboard to show the "Today's Schedule" timeline
  getToday() { return this.http.get<Task[]>(`${this.base}/today`); }
  // Fetch upcoming tasks — could be used for a "coming soon" widget
  getUpcoming() { return this.http.get<Task[]>(`${this.base}/upcoming`); }
  // Fetch a single task by ID — used by the task-detail page
  getOne(id: string) { return this.http.get<Task>(`${this.base}/${id}`); }

  // Create a new task and prepend it to the local cache (newest first)
  create(dto: CreateTaskDto) {
    return this.http.post<Task>(this.base, dto).pipe(
      tap((t) => this.tasks$.next([t, ...this.tasks$.value])), // Add new task to the beginning of the list
    );
  }

  // Update an existing task (PATCH) and replace it in the local cache
  update(id: string, dto: UpdateTaskDto) {
    return this.http.patch<Task>(`${this.base}/${id}`, dto).pipe(
      tap((updated) => this.tasks$.next(this.tasks$.value.map((t) => t.id === id ? updated : t))), // Replace the updated task in the array
    );
  }

  // Delete a task and remove it from the local cache
  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.tasks$.next(this.tasks$.value.filter((t) => t.id !== id))), // Filter out the deleted task
    );
  }

  // Start the built-in timer for a task — the backend records the start timestamp
  // and sets isTimerActive=true. The updated task is reflected in the local cache.
  startTimer(id: string) {
    return this.http.post<Task>(`${this.base}/${id}/timer/start`, {}).pipe(
      tap((updated) => this.tasks$.next(this.tasks$.value.map((t) => t.id === id ? updated : t))),
    );
  }

  // Stop the timer for a task — the backend calculates elapsed time, adds it to trackedMins,
  // and sets isTimerActive=false. The updated task is reflected in the local cache.
  stopTimer(id: string) {
    return this.http.post<Task>(`${this.base}/${id}/timer/stop`, {}).pipe(
      tap((updated) => this.tasks$.next(this.tasks$.value.map((t) => t.id === id ? updated : t))),
    );
  }
}
