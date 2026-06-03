import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { FocusService } from './focus.service';
import { CreateFocusSessionDto } from './dto/create-session.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('focus')
export class FocusController {
  constructor(private focusService: FocusService) {}

  // List sessions, optionally filtered by date range or task.
  @Get('sessions')
  findAll(
    @CurrentUser('id') userId: string,
    @Query('taskId') taskId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.focusService.findAll(userId, {
      taskId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // Today's summary: count + minutes (uses ?today=YYYY-MM-DD for local-day correctness).
  @Get('today')
  today(@CurrentUser('id') userId: string, @Query('today') today?: string) {
    return this.focusService.getTodaySummary(userId, today ?? '');
  }

  // Record a completed (or abandoned) session.
  @Post('sessions')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateFocusSessionDto) {
    return this.focusService.create(userId, dto);
  }

  @Delete('sessions/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.focusService.remove(userId, id);
  }
}
