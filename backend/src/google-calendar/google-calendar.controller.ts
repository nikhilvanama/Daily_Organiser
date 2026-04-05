import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GoogleCalendarService } from './google-calendar.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('google')
export class GoogleCalendarController {
  constructor(private gcalService: GoogleCalendarService) {}

  // GET /api/google/auth — Returns the Google OAuth consent URL
  // Frontend will redirect the user to this URL
  @Get('auth')
  getAuthUrl(@CurrentUser('id') userId: string) {
    const url = this.gcalService.getAuthUrl(userId);
    return { url };
  }

  // GET /api/google/callback — Google redirects here after user grants consent
  // This is marked @Public() because the redirect comes from Google, not our frontend
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string, // state = userId (set in getAuthUrl)
    @Res() res: Response,
  ) {
    await this.gcalService.handleCallback(code, state);
    // Redirect back to the frontend — use env var in production, localhost in dev
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.redirect(`${frontendUrl}/dashboard?gcal=connected`);
  }

  // GET /api/google/status — Check if user has connected Google Calendar
  @Get('status')
  async status(@CurrentUser('id') userId: string) {
    const connected = await this.gcalService.isConnected(userId);
    return { connected };
  }

  // POST /api/google/disconnect — Remove stored Google tokens
  @Post('disconnect')
  async disconnect(@CurrentUser('id') userId: string) {
    await this.gcalService.disconnect(userId);
    return { disconnected: true };
  }

  // POST /api/google/sync-all — Push all existing tasks (with dueDate) to Google Calendar
  @Post('sync-all')
  async syncAll(@CurrentUser('id') userId: string) {
    const result = await this.gcalService.syncAllTasks(userId);
    return result;
  }
}
