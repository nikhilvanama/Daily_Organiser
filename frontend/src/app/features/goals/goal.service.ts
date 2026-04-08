// Import Injectable for DI registration
import { Injectable } from '@angular/core';
// HttpClient for making REST API calls to the NestJS backend
import { HttpClient } from '@angular/common/http';
// BehaviorSubject holds the latest goals list and emits updates to all subscribers
import { BehaviorSubject } from 'rxjs';
// tap operator performs side effects (updating the BehaviorSubject) within the observable pipeline
import { tap } from 'rxjs/operators';
// Goal-related type definitions and DTOs for the three-level hierarchy (Goal > Milestone > MiniGoal)
import { Goal, CreateGoalDto, CreateMilestoneDto } from '../../core/models/goal.model';
// Environment config provides the base API URL
import { environment } from '../../../environments/environment';

// GoalService manages all CRUD operations for goals, milestones, and mini-goals.
// It maintains a local cache via goals$ BehaviorSubject so that the goal-list and
// goal-detail components reactively update after any mutation.
@Injectable({ providedIn: 'root' }) // Singleton — shared by goal-list, goal-form, goal-detail, and dashboard
export class GoalService {
  // Base URL for the goals REST endpoints on the NestJS backend
  private readonly base = `${environment.apiUrl}/goals`;
  // BehaviorSubject acting as a local cache of all goals — subscribed to by the goal-list component
  goals$ = new BehaviorSubject<Goal[]>([]);

  constructor(private http: HttpClient) {} // Inject HttpClient for API communication

  // Fetch all goals and update the local cache
  loadAll() {
    return this.http.get<Goal[]>(this.base).pipe(tap((g) => this.goals$.next(g)));
  }

  // Fetch a single goal by ID — used by the goal-detail page to get full milestone/mini-goal data
  getOne(id: string) { return this.http.get<Goal>(`${this.base}/${id}`); }

  create(dto: CreateGoalDto) {
    return this.http.post<Goal>(this.base, dto).pipe(
      tap((g) => this.goals$.next([...this.goals$.value, g])),
    );
  }

  // Update an existing goal (PATCH) and replace it in the local cache
  update(id: string, dto: Partial<CreateGoalDto>) {
    return this.http.patch<Goal>(`${this.base}/${id}`, dto).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === id ? updated : g))),
    );
  }

  // Delete a goal and remove it from the local cache
  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.goals$.next(this.goals$.value.filter((g) => g.id !== id))),
    );
  }

  // Add a milestone to a goal — the backend returns the full updated goal object
  // (including the new milestone), which replaces the old goal in the cache.
  addMilestone(goalId: string, dto: CreateMilestoneDto) {
    return this.http.post<Goal>(`${this.base}/${goalId}/milestones`, dto).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === goalId ? updated : g))),
    );
  }

  updateMilestone(goalId: string, milestoneId: string, dto: Partial<CreateMilestoneDto>) {
    return this.http.patch<Goal>(`${this.base}/${goalId}/milestones/${milestoneId}`, dto).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === goalId ? updated : g))),
    );
  }

  reorderMilestones(goalId: string, milestoneIds: string[]) {
    return this.http.patch<Goal>(`${this.base}/${goalId}/milestones/reorder`, { milestoneIds }).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === goalId ? updated : g))),
    );
  }

  // Mark a milestone as completed — the backend updates the milestone status,
  // recalculates the goal's overall progress percentage, and returns the updated goal.
  completeMilestone(goalId: string, milestoneId: string) {
    return this.http.patch<Goal>(`${this.base}/${goalId}/milestones/${milestoneId}/complete`, {}).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === goalId ? updated : g))),
    );
  }

  // Delete a milestone and update the local cache by filtering it out of the goal's milestones array.
  // Unlike other operations, this endpoint does not return the full goal, so we manually update the cache.
  deleteMilestone(goalId: string, milestoneId: string) {
    return this.http.delete(`${this.base}/${goalId}/milestones/${milestoneId}`).pipe(
      tap(() => {
        // Manually remove the milestone from the cached goal object
        const updated = this.goals$.value.map((g) => {
          if (g.id !== goalId) return g;
          return { ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) };
        });
        this.goals$.next(updated);
      }),
    );
  }

  // --- Mini-goals: granular checklist items within a milestone ---

  // Add a mini-goal to a specific milestone — the backend returns the full updated goal
  addMiniGoal(goalId: string, milestoneId: string, title: string) {
    return this.http.post<Goal>(`${this.base}/${goalId}/milestones/${milestoneId}/minigoals`, { title }).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === goalId ? updated : g))),
    );
  }

  // Toggle a mini-goal between PENDING and COMPLETED states — the backend
  // recalculates progress and returns the full updated goal.
  toggleMiniGoal(goalId: string, miniGoalId: string) {
    return this.http.patch<Goal>(`${this.base}/${goalId}/minigoals/${miniGoalId}/toggle`, {}).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === goalId ? updated : g))),
    );
  }

  // Remove a mini-goal — the backend returns the full updated goal with recalculated progress
  removeMiniGoal(goalId: string, miniGoalId: string) {
    return this.http.delete<Goal>(`${this.base}/${goalId}/minigoals/${miniGoalId}`).pipe(
      tap((updated) => this.goals$.next(this.goals$.value.map((g) => g.id === goalId ? updated : g))),
    );
  }
}
