// Import Module decorator to define the Dashboard module which provides aggregated statistics, activity feed, and calendar data
import { Module } from '@nestjs/common';
// Import DashboardController which exposes read-only endpoints for dashboard stats, activity, and calendar at /dashboard/*
import { DashboardController } from './dashboard.controller';
// Import DashboardService which contains the business logic for aggregating data from tasks, goals, and wishlist collections
import { DashboardService } from './dashboard.service';

// Define the DashboardModule which bundles the dashboard controller and service together
@Module({
  // Register DashboardController to handle HTTP requests to /dashboard/* endpoints (stats, activity, calendar)
  controllers: [DashboardController],
  // Register DashboardService as a provider for dependency injection into the controller
  providers: [DashboardService],
})
export class DashboardModule {}
