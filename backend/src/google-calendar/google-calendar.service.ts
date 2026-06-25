import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { FirebaseService } from '../prisma/firebase.service';

@Injectable()
export class GoogleCalendarService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(
    private firebase: FirebaseService,
    private config: ConfigService,
  ) {
    this.clientId = this.config.get<string>('GOOGLE_CLIENT_ID')!;
    this.clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET')!;
    this.redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI')!;
  }

  // Create a new OAuth2Client instance
  private createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  // Generate the Google OAuth consent URL — userId is passed as state for the callback.
  // Scopes:
  //   - calendar.events       — read/write events on calendars the user grants (primary)
  //   - calendar.readonly     — read events across all calendars the user is subscribed to,
  //                             so holidays/festivals/birthdays/external bookings show up
  //   - calendar.calendarlist.readonly — list the user's subscribed calendars
  getAuthUrl(userId: string): string {
    const oauth2Client = this.createOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      ],
      state: userId,
    });
  }

  // Exchange the authorization code for tokens and store them in Firebase
  async handleCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in Firebase under the user's record
    await this.firebase.update(`users/${userId}`, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: tokens.expiry_date,
      googleCalendarConnected: true,
    });
  }

  // Check if a user has connected their Google Calendar
  async isConnected(userId: string): Promise<boolean> {
    const user = await this.firebase.get<any>(`users/${userId}`);
    return !!(user?.googleCalendarConnected && user?.googleRefreshToken);
  }

  // Disconnect Google Calendar by removing stored tokens
  async disconnect(userId: string): Promise<void> {
    await this.firebase.update(`users/${userId}`, {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleCalendarConnected: false,
    });
  }

  // Classify Google API errors that mean "this stored token won't work, no matter how often
  // we retry." 401s, invalid_grant, and invalid_token fall into this bucket. 403 is
  // intentionally excluded — Google returns 403 for per-calendar permission denials too,
  // and we don't want one bad calendar to nuke the whole connection.
  private isAuthError(err: any): boolean {
    const code = err?.code ?? err?.response?.status ?? err?.response?.data?.error?.code;
    const errorField = err?.response?.data?.error;
    const msg = (err?.message || '').toString();
    if (code === 401) return true;
    if (msg.includes('invalid_grant') || msg.includes('invalid_token')) return true;
    if (typeof errorField === 'string' && (errorField === 'invalid_grant' || errorField === 'invalid_token')) return true;
    return false;
  }

  // When a Google API call returns an auth error (revoked / scope-mismatched refresh token,
  // 401, etc.), mark the connection as disconnected in Firebase so the UI prompts a reconnect
  // instead of silently failing forever. Returns true if the error was handled.
  private async handleAuthError(userId: string, err: any): Promise<boolean> {
    if (!this.isAuthError(err)) return false;
    console.warn(`[gcal] auth error for user ${userId} (${err?.message}) — clearing stored connection`);
    await this.firebase.update(`users/${userId}`, {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleCalendarConnected: false,
    });
    return true;
  }

  // Get an authorized OAuth2Client for a user (handles token refresh automatically)
  private async getAuthorizedClient(userId: string): Promise<OAuth2Client> {
    const user = await this.firebase.get<any>(`users/${userId}`);
    if (!user?.googleRefreshToken) {
      throw new Error('User has not connected Google Calendar');
    }

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry,
    });

    // Listen for token refresh events and persist new tokens to Firebase
    oauth2Client.on('tokens', async (newTokens) => {
      const update: Record<string, any> = {};
      if (newTokens.access_token) update['googleAccessToken'] = newTokens.access_token;
      if (newTokens.expiry_date) update['googleTokenExpiry'] = newTokens.expiry_date;
      if (newTokens.refresh_token) update['googleRefreshToken'] = newTokens.refresh_token;
      if (Object.keys(update).length > 0) {
        await this.firebase.update(`users/${userId}`, update);
      }
    });

    return oauth2Client;
  }

  // Convert a task to a Google Calendar event object
  private taskToEvent(task: any): calendar_v3.Schema$Event {
    const date = task.dueDate?.split('T')[0]; // Extract YYYY-MM-DD
    const event: calendar_v3.Schema$Event = {
      summary: task.title,
      description: `[${(task.type || 'task').toUpperCase()}] ${task.description || ''}`.trim(),
      location: task.location || undefined,
    };

    if (task.startTime && task.endTime && date) {
      // Timed event: combine date + time into RFC3339 format
      event.start = { dateTime: `${date}T${task.startTime}:00`, timeZone: 'Asia/Kolkata' };
      event.end = { dateTime: `${date}T${task.endTime}:00`, timeZone: 'Asia/Kolkata' };
    } else if (task.startTime && date) {
      // Has start time but no end time — default to 1 hour duration
      const [h, m] = task.startTime.split(':').map(Number);
      const endH = String(h + 1).padStart(2, '0');
      event.start = { dateTime: `${date}T${task.startTime}:00`, timeZone: 'Asia/Kolkata' };
      event.end = { dateTime: `${date}T${endH}:${String(m).padStart(2, '0')}:00`, timeZone: 'Asia/Kolkata' };
    } else if (date) {
      // All-day event (no specific time)
      event.start = { date };
      event.end = { date };
    }

    // Color coding based on task type
    const colorMap: Record<string, string> = {
      task: '9',      // Blueberry
      trip: '2',      // Sage
      train: '5',     // Banana
      dinner: '4',    // Flamingo
      meeting: '3',   // Grape
      event: '7',     // Peacock
      reminder: '6',  // Tangerine
    };
    event.colorId = colorMap[task.type] || '9';

    return event;
  }

  // Create a Google Calendar event from a task — returns the Google event ID
  async createEvent(userId: string, task: any): Promise<string | null> {
    if (!task.dueDate) return null;

    try {
      const auth = await this.getAuthorizedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const event = this.taskToEvent(task);
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      console.log(`Google Calendar: Created event ${response.data.id} for task ${task.id}`);
      return response.data.id || null;
    } catch (err: any) {
      console.error('Google Calendar createEvent error:', err.message);
      await this.handleAuthError(userId, err);
      return null;
    }
  }

  // Update an existing Google Calendar event
  async updateEvent(userId: string, googleEventId: string, task: any): Promise<void> {
    try {
      const auth = await this.getAuthorizedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const event = this.taskToEvent(task);
      await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: event,
      });

      console.log(`Google Calendar: Updated event ${googleEventId}`);
    } catch (err: any) {
      console.error('Google Calendar updateEvent error:', err.message);
      await this.handleAuthError(userId, err);
    }
  }

  // Sync ALL existing tasks (with dueDate and no googleEventId) to Google Calendar
  async syncAllTasks(userId: string): Promise<{ synced: number; failed: number }> {
    const connected = await this.isConnected(userId);
    if (!connected) return { synced: 0, failed: 0 };

    const allTasks = await this.firebase.getList<any>('tasks');
    const userTasks = allTasks.filter(
      (t: any) => t.userId === userId && t.dueDate && !t.googleEventId,
    );

    let synced = 0;
    let failed = 0;

    for (const task of userTasks) {
      try {
        const googleEventId = await this.createEvent(userId, task);
        if (googleEventId) {
          await this.firebase.update(`tasks/${task.id}`, { googleEventId });
          synced++;
        } else {
          failed++;
        }
      } catch (err: any) {
        console.error(`Sync failed for task ${task.id}:`, err.message);
        failed++;
      }
    }

    console.log(`Google Calendar: Synced ${synced} tasks, ${failed} failed for user ${userId}`);
    return { synced, failed };
  }

  // List events across ALL of the user's subscribed Google calendars in a date range.
  // Used to pull external bookings (restaurant, movie tickets), holidays, festivals, birthdays
  // into our own calendar view. Events we previously pushed from this app are filtered out
  // (matched by Google event ID stored on each task as googleEventId) to avoid duplicates.
  async listEvents(
    userId: string,
    from: string, // YYYY-MM-DD inclusive
    to: string,   // YYYY-MM-DD inclusive (events ending on this day still show)
  ): Promise<Array<{
    id: string;
    title: string;
    start: string;       // YYYY-MM-DD — used to bucket into calendar cells
    end: string;         // YYYY-MM-DD — for multi-day events
    startTime: string | null;
    endTime: string | null;
    allDay: boolean;
    location: string | null;
    calendarName: string;
    htmlLink: string;
  }>> {
    const connected = await this.isConnected(userId);
    if (!connected) return [];

    try {
      const auth = await this.getAuthorizedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      // RFC3339 bounds: start of `from` to end of `to` in UTC. Google's `timeMin`/`timeMax`
      // are exclusive at the end, so we add a day to `to` and use start-of-day.
      const timeMin = new Date(`${from}T00:00:00.000Z`).toISOString();
      const toEnd = new Date(`${to}T00:00:00.000Z`);
      toEnd.setUTCDate(toEnd.getUTCDate() + 1);
      const timeMax = toEnd.toISOString();

      // Step 1: enumerate the user's subscribed calendars. If the calendarList scope wasn't
      // granted (older connection), fall back to just the primary calendar — but re-throw
      // auth errors so the outer catch can clear the dead connection.
      let calendarIds: { id: string; summary: string }[];
      try {
        const list = await calendar.calendarList.list();
        calendarIds = (list.data.items ?? [])
          .filter((c) => c.id)
          .map((c) => ({ id: c.id!, summary: c.summary || c.id! }));
        if (calendarIds.length === 0) calendarIds = [{ id: 'primary', summary: 'Primary' }];
        console.log(`[gcal] listEvents user=${userId} calendars=${calendarIds.length}`);
      } catch (err: any) {
        const msg = err?.message || '';
        console.warn(`[gcal] calendarList.list failed (${msg}) — falling back to primary only`);
        if (this.isAuthError(err)) throw err;
        calendarIds = [{ id: 'primary', summary: 'Primary' }];
      }

      // Step 2: fetch events from each calendar in parallel. Per-calendar errors are
      // swallowed (one bad calendar shouldn't tank the whole response) UNLESS the error
      // looks like an auth failure (invalid_grant / 401) — those propagate so the outer
      // catch clears the dead connection and the UI prompts a reconnect.
      const results = await Promise.all(
        calendarIds.map((c) =>
          calendar.events
            .list({
              calendarId: c.id,
              timeMin,
              timeMax,
              singleEvents: true,        // expand recurring events into individual instances
              orderBy: 'startTime',
              maxResults: 250,
            })
            .then((r) => ({ events: r.data.items ?? [], calendarName: c.summary }))
            .catch((err: any) => {
              console.warn(`[gcal] events.list failed for calendar "${c.summary}": ${err?.message}`);
              if (this.isAuthError(err)) throw err;
              return { events: [], calendarName: c.summary };
            }),
        ),
      );
      const totalRaw = results.reduce((sum, r) => sum + r.events.length, 0);
      console.log(`[gcal] listEvents user=${userId} fetched=${totalRaw} events across ${calendarIds.length} calendars`);

      // Step 3: build a set of Google event IDs that originated from our own pushes, so we
      // don't double-count them when the user has an app-task and the Google event for it.
      const tasks = await this.firebase.getList<any>('tasks');
      const ownPushedIds = new Set(
        tasks
          .filter((t: any) => t.userId === userId && t.googleEventId)
          .map((t: any) => t.googleEventId as string),
      );

      // Step 4: flatten + normalize the events.
      const out: Array<any> = [];
      for (const { events, calendarName } of results) {
        for (const ev of events) {
          if (!ev.id || ownPushedIds.has(ev.id)) continue;
          if (ev.status === 'cancelled') continue;

          // All-day events use `date`; timed events use `dateTime`.
          const startDate = ev.start?.date ?? ev.start?.dateTime;
          const endDate = ev.end?.date ?? ev.end?.dateTime;
          if (!startDate) continue;

          const allDay = !!ev.start?.date;
          let startDay: string;
          let endDay: string;
          let startTime: string | null = null;
          let endTime: string | null = null;

          if (allDay) {
            startDay = ev.start!.date!;
            // Google all-day end dates are exclusive — subtract 1 day to make them inclusive
            // for our cell-bucketing logic.
            const e = new Date(`${ev.end?.date ?? ev.start!.date}T00:00:00Z`);
            e.setUTCDate(e.getUTCDate() - 1);
            endDay = e.toISOString().split('T')[0];
            if (endDay < startDay) endDay = startDay; // single-day all-day events
          } else {
            const s = new Date(ev.start!.dateTime!);
            const e = new Date(ev.end!.dateTime!);
            startDay = this.localDayKey(s);
            endDay = this.localDayKey(e);
            startTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
            endTime = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
          }

          out.push({
            id: ev.id,
            title: ev.summary || '(no title)',
            start: startDay,
            end: endDay,
            startTime,
            endTime,
            allDay,
            location: ev.location ?? null,
            calendarName,
            htmlLink: ev.htmlLink ?? '',
          });
        }
      }

      // Sort newest-first within a day by start time
      out.sort((a, b) => {
        const d = a.start.localeCompare(b.start);
        if (d !== 0) return d;
        return (a.startTime ?? '').localeCompare(b.startTime ?? '');
      });
      return out;
    } catch (err: any) {
      console.error('Google Calendar listEvents error:', err.message);
      await this.handleAuthError(userId, err);
      return [];
    }
  }

  // Convert a Date to a local YYYY-MM-DD string (server local time, fine for users in IST).
  private localDayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Delete a Google Calendar event
  async deleteEvent(userId: string, googleEventId: string): Promise<void> {
    try {
      const auth = await this.getAuthorizedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });

      console.log(`Google Calendar: Deleted event ${googleEventId}`);
    } catch (err: any) {
      console.error('Google Calendar deleteEvent error:', err.message);
      await this.handleAuthError(userId, err);
    }
  }
}
