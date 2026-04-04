// Import Module decorator to define the Goals module which handles long-term goals, milestones, and mini-goals in the Daily Organizer app
import { Module } from '@nestjs/common';
// Import GoalsController which exposes CRUD endpoints for goals, milestones, and mini-goals at /goals/*
import { GoalsController } from './goals.controller';
// Import GoalsService which contains the business logic for managing goals, their milestones, and mini-goals with progress tracking
import { GoalsService } from './goals.service';

// Define the GoalsModule which bundles the goals controller and service together
@Module({
  // Register GoalsController to handle HTTP requests to /goals/* endpoints (goals CRUD, milestone CRUD, mini-goal CRUD)
  controllers: [GoalsController],
  // Register GoalsService as a provider for dependency injection into the controller
  providers: [GoalsService],
})
export class GoalsModule {}
