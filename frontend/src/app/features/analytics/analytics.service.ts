import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AnalyticsRange, AnalyticsSummary } from '../../core/models/analytics.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly base = `${environment.apiUrl}/analytics`;
  private http = inject(HttpClient);

  // Build "YYYY-MM-DD" from the user's local clock — passed to the backend so date math
  // matches the user's view of "today" (matters for the streak / weekday-bucket logic).
  private localTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getSummary(range: AnalyticsRange) {
    return this.http.get<AnalyticsSummary>(
      `${this.base}/summary?range=${range}&today=${this.localTodayKey()}`,
    );
  }
}
