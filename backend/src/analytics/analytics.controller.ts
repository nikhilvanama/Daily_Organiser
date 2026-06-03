import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // GET /api/analytics/summary?range=7d|30d|90d|365d&today=YYYY-MM-DD
  @Get('summary')
  summary(
    @CurrentUser('id') userId: string,
    @Query('range') range: string = '30d',
    @Query('today') today?: string,
  ) {
    if (!['7d', '30d', '90d', '365d'].includes(range)) {
      throw new BadRequestException('range must be one of 7d, 30d, 90d, 365d');
    }
    return this.analyticsService.getSummary(userId, range as any, today);
  }
}
