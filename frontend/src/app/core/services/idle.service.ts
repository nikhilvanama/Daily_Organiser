import { Injectable, NgZone, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

// Auto-logout thresholds
const IDLE_LIMIT_MS = 60 * 60 * 1000;       // 1 hour with no activity → sign out
const WARNING_BEFORE_MS = 5 * 60 * 1000;    // 5-minute heads-up toast before logout
const CHECK_INTERVAL_MS = 30 * 1000;        // poll once every 30s

@Injectable({ providedIn: 'root' })
export class IdleService {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private ngZone = inject(NgZone);

  private lastActivity = Date.now();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private warned = false;

  // Cached bound listener so add/remove pairs match.
  private readonly resetActivity = () => {
    this.lastActivity = Date.now();
    this.warned = false;
  };

  // Events we treat as "user is here". Skipping mousemove on purpose — it fires far too
  // often and a still mouse on the desk shouldn't keep a session alive forever.
  private readonly activityEvents = ['mousedown', 'keydown', 'touchstart', 'wheel'];

  // Start tracking. Idempotent — calling again while already running is a no-op.
  // Listeners + the interval run outside Angular's zone so each event/tick doesn't
  // trigger global change detection.
  start() {
    if (this.intervalId !== null) return;
    this.lastActivity = Date.now();
    this.warned = false;
    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach((ev) =>
        document.addEventListener(ev, this.resetActivity, { passive: true }),
      );
      this.intervalId = setInterval(() => this.checkIdle(), CHECK_INTERVAL_MS);
    });
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activityEvents.forEach((ev) =>
      document.removeEventListener(ev, this.resetActivity),
    );
    this.warned = false;
  }

  private checkIdle() {
    const idleMs = Date.now() - this.lastActivity;
    if (idleMs >= IDLE_LIMIT_MS) {
      // Re-enter Angular zone so the toast + navigation actually update the view.
      this.ngZone.run(() => {
        this.stop();
        this.toast.info('Signed out due to inactivity. Please log in again.');
        this.auth.clearSession();
      });
    } else if (idleMs >= IDLE_LIMIT_MS - WARNING_BEFORE_MS && !this.warned) {
      this.warned = true;
      this.ngZone.run(() => {
        this.toast.info('You will be signed out in 5 minutes due to inactivity.');
      });
    }
  }
}
