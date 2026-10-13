import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as webpush from 'web-push';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';

// A stored browser push subscription, one per (user, browser endpoint).
type PushSub = {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
};

// Reminder times in IST (the user's timezone) — minutes since midnight.
const ROUTINE_TIME = 8 * 60;        // 08:00 — "check your daily routine"
const JOURNAL_TIME = 23 * 60;       // 23:00 — "write your journal" (only if missing)
const WINDOW_MIN = 10;              // fire window: scheduler tick may not land exactly on the minute

// PushService — Web Push reminders. Subscriptions live in Firebase so they
// survive restarts; a per-user per-day log prevents duplicate sends. The
// scheduler thinks in IST regardless of the server's timezone (Render = UTC).
@Injectable()
export class PushService {
  private readonly log = new Logger('Push');
  private readonly enabled: boolean;

  constructor(private firebase: FirebaseService) {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    this.enabled = !!(pub && priv);
    if (this.enabled) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', pub!, priv!);
      // Tick every minute; the window check makes missed ticks harmless.
      setInterval(() => this.tick().catch((e) => this.log.error(e?.message ?? e)), 60 * 1000);
      this.log.log('Web Push enabled — reminder scheduler running (IST)');
    } else {
      this.log.warn('VAPID keys missing — push reminders disabled');
    }
  }

  publicKey() {
    if (!this.enabled) throw new ServiceUnavailableException('Push is not configured on the server');
    return { publicKey: process.env.VAPID_PUBLIC_KEY };
  }

  async subscribe(userId: string, subscription: any) {
    if (!subscription?.endpoint || !subscription?.keys?.p256dh) {
      throw new ServiceUnavailableException('Invalid subscription');
    }
    const all = await this.firebase.getList<PushSub>('pushSubs');
    const existing = all.find((s) => s.endpoint === subscription.endpoint);
    if (existing) {
      await this.firebase.update(`pushSubs/${existing.id}`, { userId, keys: subscription.keys });
      return { subscribed: true };
    }
    const id = randomUUID();
    const rec: PushSub = {
      id, userId,
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      createdAt: new Date().toISOString(),
    };
    await this.firebase.ref(`pushSubs/${id}`).set(rec);
    return { subscribed: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    const all = await this.firebase.getList<PushSub>('pushSubs');
    for (const s of all.filter((x) => x.userId === userId && x.endpoint === endpoint)) {
      await this.firebase.remove(`pushSubs/${s.id}`);
    }
    return { unsubscribed: true };
  }

  async sendTest(userId: string) {
    const sent = await this.sendToUser(userId, {
      title: 'Daily Organizer 👋',
      body: 'Push reminders are working on this device.',
      url: '/dashboard',
    });
    return { sent };
  }

  // ── sending ───────────────────────────────────────────────────────────────

  private async sendToUser(userId: string, n: { title: string; body: string; url: string }): Promise<number> {
    if (!this.enabled) return 0;
    const subs = (await this.firebase.getList<PushSub>('pushSubs')).filter((s) => s.userId === userId);
    // Payload shape the Angular service worker (ngsw) renders natively,
    // including click-through navigation via onActionClick.
    const payload = JSON.stringify({
      notification: {
        title: n.title,
        body: n.body,
        // Absolute paths — relative ones fail to resolve in some Android
        // service-worker contexts and the notification shows without a logo.
        icon: '/icons/icon-192x192.png',
        // Badge = Android's small status-bar silhouette; needs a monochrome
        // white-on-transparent glyph, not the full-color app icon.
        badge: '/icons/badge-96x96.png',
        vibrate: [100, 50, 100],
        data: { onActionClick: { default: { operation: 'openWindow', url: n.url } } },
      },
    });
    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload);
        sent++;
      } catch (e: any) {
        // 404/410 = the browser dropped the subscription — clean it up
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await this.firebase.remove(`pushSubs/${s.id}`);
        } else {
          this.log.warn(`send failed (${e?.statusCode ?? '?'}) for ${s.endpoint.slice(0, 40)}…`);
        }
      }
    }
    return sent;
  }

  // ── scheduler ─────────────────────────────────────────────────────────────

  private istNow(): { date: string; minutes: number } {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // UTC → IST
    const date = ist.toISOString().slice(0, 10);
    return { date, minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes() };
  }

  private inWindow(minutes: number, target: number): boolean {
    return minutes >= target && minutes < target + WINDOW_MIN;
  }

  private async tick() {
    const { date, minutes } = this.istNow();
    const wantRoutine = this.inWindow(minutes, ROUTINE_TIME);
    const wantJournal = this.inWindow(minutes, JOURNAL_TIME);
    if (!wantRoutine && !wantJournal) return;

    const subs = await this.firebase.getList<PushSub>('pushSubs');
    const userIds = [...new Set(subs.map((s) => s.userId))];
    if (!userIds.length) return;

    const journal = wantJournal ? await this.firebase.getList<any>('journal') : [];

    for (const userId of userIds) {
      const logKey = `pushLog/${userId}_${date}`;
      const log = (await this.firebase.get<any>(logKey)) ?? {};

      if (wantRoutine && !log.routine) {
        await this.sendToUser(userId, {
          title: 'Daily Routine ⏰',
          body: 'Good morning! Check off your habits for today and keep the streaks alive.',
          url: '/habits',
        });
        await this.firebase.update(logKey, { routine: true });
      }

      if (wantJournal && !log.journal) {
        const hasEntry = journal.some((j) => j.userId === userId && j.date === date);
        if (!hasEntry) {
          await this.sendToUser(userId, {
            title: 'Journal 📓',
            body: "It's 11 pm and today's page is still empty — capture your day in a few lines (or let the AI draft it).",
            url: '/journal',
          });
        }
        // Mark either way so we never double-check or double-send tonight.
        await this.firebase.update(logKey, { journal: true });
      }
    }
  }
}
