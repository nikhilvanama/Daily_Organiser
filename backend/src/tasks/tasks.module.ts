// Import Module decorator to define the Tasks module which handles daily plan items (tasks, trips, trains, dinners, meetings) in the Daily Organizer app
import { Module } from '@nestjs/common';
// Import TasksController which exposes CRUD endpoints and timer controls for tasks at /tasks/*
import { TasksController } from './tasks.controller';
// Import TasksService which contains the business logic for creating, reading, updating, deleting, and timing tasks
import { TasksService } from './tasks.service';

// Define the TasksModule which bundles the tasks controller and service together
@Module({
  // Register TasksController to handle HTTP requests to /tasks/* endpoints (GET, POST, PATCH, DELETE, timer start/stop)
  controllers: [TasksController],
  // Register TasksService as a provider for dependency injection into the controller
  providers: [TasksService],
})
export class TasksModule {}
