// Import Controller to define this class as a NestJS REST controller handling /dashboard routes
// Import Get for the read-only dashboard endpoints (stats, activity, calendar)
// Import Query to extract URL query parameters for specifying the calendar year and month
import { Controller, Get, Query } from '@nestjs/common';
// Import DashboardService which contains the business logic for aggregating data from tasks, goals, and wishlist
import { DashboardService } from './dashboard.service';
// Import CurrentUser decorator to extract the authenticated user's id from the JWT-validated request
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Define the controller at the /dashboard route prefix; all endpoints are protected by the global JwtAuthGuard
@Controller('dashboard')
export class DashboardController {
  // Inject DashboardService to delegate all dashboard-related data aggregation
  constructor(private dashboardService: DashboardService) {}

  // GET /dashboard/stats - Returns aggregated statistics (task counts, active goals, wishlist totals) for the user's dashboard
  @Get('stats')
  getStats(@CurrentUser('id') userId: string) {
    return this.dashboardService.getStats(userId);
  }

  // GET /dashboard/activity - Returns a recent activity feed combining the latest tasks, goals, and wishlist updates
  @Get('activity')
  getActivity(@CurrentUser('id') userId: string) {
    return this.dashboardService.getActivity(userId);
  }

  // GET /dashboard/calendar?year=2026&month=4 - Returns tasks for a specific month to populate the calendar view
  @Get('calendar')
  getCalendar(
    // Extract the authenticated user's id from the JWT
    @CurrentUser('id') userId: string,
    // Extract the optional 'year' query parameter as a string (will be converted to number)
    @Query('year') year: string,
    // Extract the optional 'month' query parameter as a string (will be converted to number, 1-indexed)
    @Query('month') month: string,
  ) {
    // Get the current date to use as defaults when year/month query parameters are not provided
    const now = new Date();
    // Delegate to the service, converting string query params to numbers; default to current year and month if not specified
    return this.dashboardService.getCalendar(
      userId,
      year ? +year : now.getFullYear(), // Convert year string to number, or use the current year as default
      month ? +month : now.getMonth() + 1, // Convert month string to number (1-indexed), or use the current month as default
    );
  }
}
