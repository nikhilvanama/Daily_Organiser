import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
}
