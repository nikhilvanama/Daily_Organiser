import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// PushNotifyService — browser push subscriptions for the reminder notifications
// (daily routine nudge + 11pm journal reminder). The service worker only runs
// in production builds, so `supported` is false during `ng serve` — the
// Profile card explains that instead of showing a dead toggle.
@Injectable({ providedIn: 'root' })
export class PushNotifyService {
  private swPush = inject(SwPush);
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/push`;

  readonly supported = this.swPush.isEnabled && typeof Notification !== 'undefined';
  enabled = signal(false);
  busy = signal(false);

  constructor() {
    if (this.supported) {
      this.swPush.subscription.subscribe((s) => this.enabled.set(!!s));
    }
  }

  async enable(): Promise<void> {
    this.busy.set(true);
    try {
      const { publicKey } = await firstValueFrom(this.http.get<{ publicKey: string }>(`${this.base}/public-key`));
      const sub = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
      await firstValueFrom(this.http.post(`${this.base}/subscribe`, { subscription: sub.toJSON() }));
      this.enabled.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  async disable(): Promise<void> {
    this.busy.set(true);
    try {
      const sub = await firstValueFrom(this.swPush.subscription);
      if (sub) {
        await firstValueFrom(this.http.post(`${this.base}/unsubscribe`, { endpoint: sub.endpoint }));
        await sub.unsubscribe();
      }
      this.enabled.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  test() {
    return this.http.post<{ sent: number }>(`${this.base}/test`, {});
  }
}
