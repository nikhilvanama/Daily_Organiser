// Import ForbiddenException to block access when a user tries to modify another user's task
// Import Injectable to register this service in NestJS dependency injection
// Import NotFoundException when a requested task does not exist in the database
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// Import FirebaseService to perform CRUD operations on tasks in the Firebase Realtime Database
import { FirebaseService } from '../prisma/firebase.service';
// Import CreateTaskDto which defines and validates the fields for creating a new task (title, type, priority, dueDate, etc.)
import { CreateTaskDto } from './dto/create-task.dto';
// Import UpdateTaskDto which extends CreateTaskDto with all fields optional for partial updates
import { UpdateTaskDto } from './dto/update-task.dto';
// Import randomUUID to generate unique task IDs since Firebase Realtime Database doesn't auto-generate UUIDs
import { randomUUID } from 'crypto';

// @Injectable() marks this class as a NestJS service that can be injected into TasksController
@Injectable()
export class TasksService {
  // Inject FirebaseService to perform database operations on the 'tasks' and 'categories' collections
  constructor(private firebase: FirebaseService) {}

  // Retrieves all tasks for the authenticated user, with optional filtering by status, priority, categoryId, and type
  async findAll(userId: string, query: Record<string, string>) {
    // Destructure optional filter parameters from the query string
    const { status, priority, categoryId, type } = query;
    // Fetch all tasks from the 'tasks' collection in Firebase
    let tasks = await this.firebase.getList<any>('tasks');
    // Filter to only include tasks belonging to the authenticated user
    tasks = tasks.filter((t: any) => t.userId === userId);
    // Apply optional status filter (e.g., TODO, IN_PROGRESS, DONE) if provided in the query string
    if (status) tasks = tasks.filter((t: any) => t.status === status);
    // Apply optional priority filter (e.g., LOW, MEDIUM, HIGH) if provided in the query string
    if (priority) tasks = tasks.filter((t: any) => t.priority === priority);
    // Apply optional categoryId filter to show tasks from a specific category
    if (categoryId) tasks = tasks.filter((t: any) => t.categoryId === categoryId);
    // Apply optional type filter (e.g., task, trip, train, dinner, meeting) if provided in the query string
    if (type) tasks = tasks.filter((t: any) => t.type === type);
    // Attach the full category object to each task and return the enriched list
    return this.withCategories(tasks);
  }

  // Retrieves all tasks for the authenticated user that are due today (used for the daily plan view)
  async findToday(userId: string) {
    // Get today's date as a YYYY-MM-DD string for prefix matching against task dueDates
    const today = new Date().toISOString().split('T')[0];
    // Fetch all tasks from Firebase
    let tasks = await this.firebase.getList<any>('tasks');
    // Filter to only include tasks that belong to the user AND have a dueDate starting with today's date
    tasks = tasks.filter((t: any) => t.userId === userId && t.dueDate && t.dueDate.startsWith(today));
    // Attach category data to each task and return
    return this.withCategories(tasks);
  }

  // Retrieves all incomplete tasks for the authenticated user due within the next 7 days (upcoming view)
  async findUpcoming(userId: string) {
    // Get the current date/time for the start of the upcoming window
    const now = new Date();
    // Calculate the date 7 days from now for the end of the upcoming window
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    // Fetch all tasks from Firebase
    let tasks = await this.firebase.getList<any>('tasks');
    // Filter tasks to those belonging to the user, not yet done, and with a dueDate within the next 7 days
    tasks = tasks.filter((t: any) => {
      // Exclude tasks from other users, tasks without a due date, and already completed tasks
      if (t.userId !== userId || !t.dueDate || t.status === 'DONE') return false;
      // Parse the task's due date to compare against the 7-day window
      const d = new Date(t.dueDate);
      // Include only tasks due between now and 7 days from now
      return d >= now && d <= weekLater;
    });
    // Attach category data to each task and return
    return this.withCategories(tasks);
  }

  // Retrieves a single task by ID, verifying that it belongs to the authenticated user
  async findOne(userId: string, id: string) {
    // Fetch the task from Firebase by its unique ID
    const task = await this.firebase.get<any>(`tasks/${id}`);
    // If the task does not exist, throw a 404 error
    if (!task) throw new NotFoundException('Task not found');
    // If the task belongs to a different user, throw a 403 error to prevent unauthorized access
    if (task.userId !== userId) throw new ForbiddenException();
    // Attach the category object and return the enriched task
    return this.withCategory(task);
  }

  // Creates a new task (or trip/train/dinner/meeting) for the authenticated user
  async create(userId: string, dto: CreateTaskDto) {
    // Generate a unique UUID for the new task
    const id = randomUUID();
    // Build the complete task record with all fields, using sensible defaults for optional fields
    const task = {
      id, // Unique task identifier used as the Firebase key
      title: dto.title, // Task title/name (required)
      description: dto.description ?? null, // Optional detailed description of the task
      type: dto.type ?? 'task', // Task type: task, trip, train, dinner, meeting, event, or reminder
      status: dto.status ?? 'TODO', // Current status: TODO, IN_PROGRESS, or DONE
      priority: dto.priority ?? 'MEDIUM', // Priority level: LOW, MEDIUM, or HIGH
      dueDate: dto.dueDate ?? null, // Optional due date in ISO format for scheduling on the daily plan
      startTime: dto.startTime ?? null, // Optional start time for time-bound events like meetings or trains
      endTime: dto.endTime ?? null, // Optional end time for time-bound events
      location: dto.location ?? null, // Optional location for trips, dinners, or meetings
      completedAt: null, // Timestamp set when the task is marked as DONE; null until completed
      estimatedMins: dto.estimatedMins ?? null, // Optional estimated duration in minutes for time planning
      trackedMins: 0, // Accumulated tracked time in minutes from the built-in timer; starts at 0
      isTimerActive: false, // Whether the task's timer is currently running
      timerStartAt: null, // Timestamp of when the timer was last started; null when timer is stopped
      userId, // Foreign key linking this task to the authenticated user who created it
      categoryId: dto.categoryId ?? null, // Optional foreign key linking to a category for organization/filtering
      createdAt: new Date().toISOString(), // Timestamp when the task was created
      updatedAt: new Date().toISOString(), // Timestamp of the last modification to this task
    };
    // Write the complete task record to Firebase at tasks/{id}
    await this.firebase.ref(`tasks/${id}`).set(task);
    // Attach the category object (if categoryId is set) and return the enriched task
    return this.withCategory(task);
  }

  // Updates an existing task with the provided fields (partial update), handling status transitions and completedAt timestamps
  async update(userId: string, id: string, dto: UpdateTaskDto) {
    // Verify the task exists and belongs to the authenticated user before allowing modifications
    await this.ensureOwnership(userId, id);
    // Spread the DTO fields into a data object and add the updatedAt timestamp
    const data: Record<string, any> = { ...dto, updatedAt: new Date().toISOString() };
    // If the task is being marked as DONE, record the completion timestamp
    if (dto.status === 'DONE') data['completedAt'] = new Date().toISOString();
    // If the status is changing to something other than DONE, clear the completedAt timestamp
    else if (dto.status) data['completedAt'] = null;
    // Apply the partial update to the task in Firebase
    await this.firebase.update(`tasks/${id}`, data);
    // Fetch the fully updated task record from Firebase
    const updated = await this.firebase.get<any>(`tasks/${id}`);
    // Attach the category and return the enriched updated task
    return this.withCategory(updated);
  }

  // Deletes a task from the database after verifying ownership
  async remove(userId: string, id: string) {
    // Verify the task exists and belongs to the authenticated user before deletion
    await this.ensureOwnership(userId, id);
    // Remove the task record from Firebase permanently
    await this.firebase.remove(`tasks/${id}`);
    // Return a confirmation object indicating successful deletion
    return { deleted: true };
  }

  // Starts the built-in timer for a task, recording the start timestamp (used for time tracking in the daily plan)
  async startTimer(userId: string, id: string) {
    // Verify the task exists and belongs to the authenticated user
    await this.ensureOwnership(userId, id);
    // Set the timer as active and record the current timestamp as the start time
    await this.firebase.update(`tasks/${id}`, { isTimerActive: true, timerStartAt: new Date().toISOString() });
    // Return the updated task record with the active timer state
    return this.firebase.get(`tasks/${id}`);
  }

  // Stops the built-in timer for a task, calculating elapsed minutes and adding them to the tracked total
  async stopTimer(userId: string, id: string) {
    // Verify ownership and get the current task data (needed to read timerStartAt and trackedMins)
    const task = await this.ensureOwnership(userId, id);
    // If the timer isn't active or has no start time, return the task unchanged
    if (!task.isTimerActive || !task.timerStartAt) return task;
    // Calculate the elapsed time in minutes since the timer was started
    const elapsed = Math.floor((Date.now() - new Date(task.timerStartAt).getTime()) / 60000);
    // Deactivate the timer, clear the start timestamp, and add the elapsed minutes to the running total
    await this.firebase.update(`tasks/${id}`, {
      isTimerActive: false, // Mark the timer as stopped
      timerStartAt: null, // Clear the timer start timestamp
      trackedMins: (task.trackedMins || 0) + elapsed, // Accumulate the elapsed minutes into the total tracked time
    });
    // Return the updated task with the new tracked minutes total
    return this.firebase.get(`tasks/${id}`);
  }

  // Private helper that verifies a task exists and belongs to the specified user; throws exceptions if not
  private async ensureOwnership(userId: string, id: string) {
    // Fetch the task from Firebase by its ID
    const task = await this.firebase.get<any>(`tasks/${id}`);
    // If the task does not exist, throw a 404 Not Found error
    if (!task) throw new NotFoundException('Task not found');
    // If the task belongs to a different user, throw a 403 Forbidden error
    if (task.userId !== userId) throw new ForbiddenException();
    // Return the task data so callers can use it without an extra database read
    return task;
  }

  // Private helper that attaches the full category object to a single task by looking up the categoryId in Firebase
  private async withCategory(task: any) {
    // If the task has a categoryId, fetch the category record from Firebase and attach it
    if (task.categoryId) {
      task.category = await this.firebase.get(`categories/${task.categoryId}`) ?? null;
    } else {
      // If no categoryId is set, explicitly set category to null for consistent API response shape
      task.category = null;
    }
    // Return the task with the category object attached
    return task;
  }

  // Private helper that attaches category objects to an array of tasks in parallel
  private async withCategories(tasks: any[]) {
    // Use Promise.all to fetch all categories concurrently for better performance
    return Promise.all(tasks.map((t: any) => this.withCategory(t)));
  }
}
