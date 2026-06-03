import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CreatePaymentDto, CreateProjectDto, Project, UpdateProjectDto } from '../../core/models/project.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly base = `${environment.apiUrl}/projects`;
  private http = inject(HttpClient);

  projects$ = new BehaviorSubject<Project[]>([]);

  loadAll() {
    return this.http.get<Project[]>(this.base).pipe(tap((list) => this.projects$.next(list)));
  }

  getOne(id: string) {
    return this.http.get<Project>(`${this.base}/${id}`);
  }

  create(dto: CreateProjectDto) {
    return this.http.post<Project>(this.base, dto).pipe(
      tap((p) => this.projects$.next([p, ...this.projects$.value])),
    );
  }

  update(id: string, dto: UpdateProjectDto) {
    return this.http.patch<Project>(`${this.base}/${id}`, dto).pipe(
      tap((u) => this.projects$.next(this.projects$.value.map((p) => (p.id === id ? u : p)))),
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.projects$.next(this.projects$.value.filter((p) => p.id !== id))),
    );
  }

  addPayment(projectId: string, dto: CreatePaymentDto) {
    return this.http.post<Project>(`${this.base}/${projectId}/payments`, dto).pipe(
      tap((u) => this.projects$.next(this.projects$.value.map((p) => (p.id === projectId ? u : p)))),
    );
  }

  removePayment(projectId: string, paymentId: string) {
    return this.http.delete<Project>(`${this.base}/${projectId}/payments/${paymentId}`).pipe(
      tap((u) => this.projects$.next(this.projects$.value.map((p) => (p.id === projectId ? u : p)))),
    );
  }
}
