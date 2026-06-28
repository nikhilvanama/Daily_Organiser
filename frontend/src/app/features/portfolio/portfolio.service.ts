import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { MyPortfolio, PortfolioBasics, PortfolioSettings } from '../../core/models/portfolio.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly base = `${environment.apiUrl}/portfolio`;
  private http = inject(HttpClient);

  portfolio$ = new BehaviorSubject<MyPortfolio | null>(null);

  load() {
    return this.http.get<MyPortfolio>(this.base).pipe(tap((p) => this.portfolio$.next(p)));
  }

  upsertBasics(dto: PortfolioBasics) {
    // Only send DTO-whitelisted fields — ValidationPipe rejects unknown keys (e.g. updatedAt)
    const payload: Record<string, any> = {};
    const src = dto as Record<string, any>;
    for (const k of ['slug','name','headline','bio','avatar','location','email','phone','resumeUrl','availableForHire','published']) {
      if (src[k] !== undefined) payload[k] = src[k];
    }
    return this.http.put<PortfolioBasics>(`${this.base}/basics`, payload).pipe(
      tap(() => { const p = this.portfolio$.value; if (p) this.portfolio$.next({ ...p, basics: { ...p.basics, ...payload } }); }),
    );
  }

  upsertSettings(dto: Partial<PortfolioSettings>) {
    return this.http.put<PortfolioSettings>(`${this.base}/settings`, dto).pipe(
      tap((s) => { const p = this.portfolio$.value; if (p) this.portfolio$.next({ ...p, settings: s }); }),
    );
  }

  upsertInterests(items: string[]) {
    return this.http.put<string[]>(`${this.base}/interests`, { items }).pipe(
      tap(() => { const p = this.portfolio$.value; if (p) this.portfolio$.next({ ...p, interests: items }); }),
    );
  }

  // Generic collection methods
  addItem(collection: string, dto: any) {
    return this.http.post<any>(`${this.base}/${collection}`, dto).pipe(
      tap((item) => { const p = this.portfolio$.value; if (p) this.portfolio$.next({ ...p, [collection]: [...(p as any)[collection], item] }); }),
    );
  }

  updateItem(collection: string, id: string, dto: any) {
    return this.http.patch<any>(`${this.base}/${collection}/${id}`, dto).pipe(
      tap((item) => {
        const p = this.portfolio$.value;
        if (p) this.portfolio$.next({ ...p, [collection]: (p as any)[collection].map((x: any) => x.id === id ? item : x) });
      }),
    );
  }

  removeItem(collection: string, id: string) {
    return this.http.delete(`${this.base}/${collection}/${id}`).pipe(
      tap(() => {
        const p = this.portfolio$.value;
        if (p) this.portfolio$.next({ ...p, [collection]: (p as any)[collection].filter((x: any) => x.id !== id) });
      }),
    );
  }
}
