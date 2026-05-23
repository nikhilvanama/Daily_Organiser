import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('habits')
export class HabitsController {
  constructor(private habitsService: HabitsService) {}

  // The optional ?today=YYYY-MM-DD query param lets the client tell us what "today" means
  // in its local timezone. Without it, the server falls back to UTC today, which is wrong
  // for any client east of UTC during their late-night/early-morning hours.
  @Get()
  findAll(@CurrentUser('id') userId: string, @Query('today') today?: string) {
    return this.habitsService.findAll(userId, today);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateHabitDto,
    @Query('today') today?: string,
  ) {
    return this.habitsService.create(userId, dto, today);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
    @Query('today') today?: string,
  ) {
    return this.habitsService.update(userId, id, dto, today);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.habitsService.remove(userId, id);
  }

  // Toggle today's completion for this habit.
  @Post(':id/checkin')
  checkinToday(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('today') today?: string,
  ) {
    return this.habitsService.toggleCheckin(userId, id, today, today);
  }

  // Toggle a specific date's completion (for backfill / heatmap clicks).
  @Post(':id/checkin/:date')
  checkinDate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('date') date: string,
    @Query('today') today?: string,
  ) {
    return this.habitsService.toggleCheckin(userId, id, date, today);
  }
}
