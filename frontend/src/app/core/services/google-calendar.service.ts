import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GoogleExternalEvent {
  id: string;
  title: string;
  start: string;             // YYYY-MM-DD
  end: string;               // YYYY-MM-DD (inclusive)
  startTime: string | null;  // HH:MM (24h) if timed
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  calendarName: string;      // 'Holidays in India', 'Primary', etc.
  htmlLink: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private readonly base = `${environment.apiUrl}/google`;
  connected = signal(false);

  constructor(private http: HttpClient) {}

  checkStatus() {
    return this.http.get<{ connected: boolean }>(`${this.base}/status`).pipe(
      tap((res) => this.connected.set(res.connected)),
    );
  }

  connect() {
    this.http.get<{ url: string }>(`${this.base}/auth`).subscribe((res) => {
      window.location.href = res.url;
    });
  }

  disconnect() {
    return this.http.post<{ disconnected: boolean }>(`${this.base}/disconnect`, {}).pipe(
      tap(() => this.connected.set(false)),
    );
  }

  syncAll() {
    return this.http.post<{ synced: number; failed: number }>(`${this.base}/sync-all`, {});
  }

  // Pull events from the user's Google Calendars (all subscribed calendars) for a date range.
  // Used by the calendar view to show external bookings, festivals, holidays alongside app plans.
  listEvents(from: string, to: string) {
    return this.http.get<GoogleExternalEvent[]>(`${this.base}/events?from=${from}&to=${to}`);
  }
}
