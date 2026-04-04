// Import Body to extract request body data for creating/updating tasks
// Import Controller to define this class as a NestJS REST controller handling /tasks routes
// Import Delete, Get, Param, Patch, Post for HTTP method decorators and route parameter extraction
// Import Query to extract URL query parameters for filtering tasks
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
// Import TasksService which contains the business logic for all task operations (CRUD, filtering, timer)
import { TasksService } from './tasks.service';
// Import CreateTaskDto to validate the request body when creating a new task/trip/train/dinner/meeting
import { CreateTaskDto } from './dto/create-task.dto';
// Import UpdateTaskDto to validate the request body when partially updating an existing task
import { UpdateTaskDto } from './dto/update-task.dto';
// Import CurrentUser decorator to extract the authenticated user's id from the JWT-validated request
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Define the controller at the /tasks route prefix; all endpoints are protected by the global JwtAuthGuard
@Controller('tasks')
export class TasksController {
  // Inject TasksService to delegate all task-related business logic
  constructor(private tasksService: TasksService) {}

  // GET /tasks - Returns all tasks for the authenticated user with optional query filters (status, priority, categoryId, type)
  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() query: Record<string, string>) {
    // Pass the user ID and query parameters to the service for filtered task retrieval
    return this.tasksService.findAll(userId, query);
  }

  // GET /tasks/today - Returns all tasks due today for the authenticated user (powers the daily plan view)
  @Get('today')
  findToday(@CurrentUser('id') userId: string) {
    return this.tasksService.findToday(userId);
  }

  // GET /tasks/upcoming - Returns all incomplete tasks due within the next 7 days for the authenticated user
  @Get('upcoming')
  findUpcoming(@CurrentUser('id') userId: string) {
    return this.tasksService.findUpcoming(userId);
  }

  // GET /tasks/:id - Returns a single task by ID, verifying it belongs to the authenticated user
  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tasksService.findOne(userId, id);
  }

  // POST /tasks - Creates a new task (or trip/train/dinner/meeting/event/reminder) for the authenticated user
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(userId, dto);
  }

  // PATCH /tasks/:id - Partially updates an existing task (title, status, priority, dueDate, etc.)
  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(userId, id, dto);
  }

  // DELETE /tasks/:id - Permanently removes a task from the database
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tasksService.remove(userId, id);
  }

  // POST /tasks/:id/timer/start - Starts the built-in time tracker for a task (records the start timestamp)
  @Post(':id/timer/start')
  startTimer(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tasksService.startTimer(userId, id);
  }

  // POST /tasks/:id/timer/stop - Stops the time tracker and adds elapsed minutes to the task's tracked total
  @Post(':id/timer/stop')
  stopTimer(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tasksService.stopTimer(userId, id);
  }
}
