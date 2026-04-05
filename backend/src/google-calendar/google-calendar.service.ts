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

  // Generate the Google OAuth consent URL — userId is passed as state for the callback
  getAuthUrl(userId: string): string {
    const oauth2Client = this.createOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',        // Request a refresh token for long-lived access
      prompt: 'consent',             // Always show consent screen to get refresh_token
      scope: ['https://www.googleapis.com/auth/calendar.events'], // Only events, not full calendar access
      state: userId,                 // Pass userId so callback knows which user to store tokens for
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
    }
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
    }
  }
}
