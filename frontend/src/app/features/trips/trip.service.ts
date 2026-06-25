import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CreateTripDto, Trip, UpdateTripDto } from '../../core/models/trip.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly base = `${environment.apiUrl}/trips`;
  private http = inject(HttpClient);

  trips$ = new BehaviorSubject<Trip[]>([]);

  loadAll() {
    return this.http.get<Trip[]>(this.base).pipe(tap((t) => this.trips$.next(t)));
  }

  create(dto: CreateTripDto) {
    return this.http.post<Trip>(this.base, dto).pipe(
      tap((t) => this.trips$.next([t, ...this.trips$.value])),
    );
  }

  update(id: string, dto: UpdateTripDto) {
    return this.http.patch<Trip>(`${this.base}/${id}`, dto).pipe(
      tap((u) => this.trips$.next(this.trips$.value.map((t) => (t.id === id ? u : t)))),
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.trips$.next(this.trips$.value.filter((t) => t.id !== id))),
    );
  }
}
