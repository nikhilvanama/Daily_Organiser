import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BuyItem, CreateBuyItemDto, UpdateBuyItemDto } from '../../core/models/buy-item.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BuyListService {
  private readonly base = `${environment.apiUrl}/buy-list`;
  private http = inject(HttpClient);

  items$ = new BehaviorSubject<BuyItem[]>([]);

  loadAll() {
    return this.http.get<BuyItem[]>(this.base).pipe(tap((i) => this.items$.next(i)));
  }

  create(dto: CreateBuyItemDto) {
    return this.http.post<BuyItem>(this.base, dto).pipe(
      tap((i) => this.items$.next([i, ...this.items$.value])),
    );
  }

  update(id: string, dto: UpdateBuyItemDto) {
    return this.http.patch<BuyItem>(`${this.base}/${id}`, dto).pipe(
      tap((u) => this.items$.next(this.items$.value.map((i) => (i.id === id ? u : i)))),
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.items$.next(this.items$.value.filter((i) => i.id !== id))),
    );
  }
}
