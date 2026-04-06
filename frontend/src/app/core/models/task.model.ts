// Import Category model because each task can optionally belong to a user-defined category
import { Category } from './category.model';

// Priority levels for tasks — used for visual badges (color-coded) and filtering
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

// Task lifecycle statuses — controls the task's progress state in lists and filters
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

// PlanType distinguishes different kinds of daily plans — the app is not just a task manager,
// it also tracks trips, train schedules, dinner reservations, meetings, events, and reminders.
// Each type gets its own icon and color in the UI (see PLAN_TYPES constant below).
export type PlanType = 'task' | 'trip' | 'train' | 'dinner' | 'meeting' | 'event' | 'reminder';

// Main Task interface — mirrors the Task entity from the NestJS/Prisma backend.
// This is the core data structure for the "My Plans" and "Today's Schedule" features.
export interface Task {
  id: string; // Unique identifier (UUID) for the task
  title: string; // Short title displayed in lists and timeline views
  description: string | null; // Optional longer description shown in the detail view
  type: PlanType; // What kind of plan this is (task, trip, meeting, etc.)
  status: TaskStatus; // Current lifecycle status (TODO, IN_PROGRESS, DONE, CANCELLED)
  priority: Priority; // Urgency level — affects badge color and sort order
  dueDate: string | null;
  endDate: string | null;           // Trip: end date for multi-day trips
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  boardingStation: string | null;   // Train: boarding station
  destinationStation: string | null;// Train: destination
  trainNumber: string | null;       // Train: number/name
  departureTime: string | null;     // Train: departure time
  meetingLink: string | null;       // Meeting: video call URL
  completedAt: string | null; // ISO timestamp when the task was marked DONE
  estimatedMins: number | null; // User's time estimate in minutes — shown in the detail view
  trackedMins: number; // Actual minutes tracked via the built-in timer feature
  isTimerActive: boolean; // Whether the task's timer is currently running
  timerStartAt: string | null; // ISO timestamp when the timer was last started (for elapsed calc)
  userId: string; // Foreign key to the owning user
  categoryId: string | null; // Optional foreign key to a user-defined category
  category: Category | null; // Populated category object (included via backend JOIN)
  googleEventId: string | null; // Google Calendar event ID (present when synced)
  createdAt: string; // ISO timestamp of task creation
  updatedAt: string; // ISO timestamp of last modification
}

// DTO for creating a new task — only title is required; everything else is optional
// so the user can quickly add a plan and fill in details later.
export interface CreateTaskDto {
  title: string; // Required: every plan needs at least a title
  description?: string; // Optional longer description
  type?: PlanType; // Defaults to 'task' on the backend if not provided
  priority?: Priority; // Defaults to 'MEDIUM' in the form
  status?: TaskStatus; // Defaults to 'TODO' in the form
  dueDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  boardingStation?: string;
  destinationStation?: string;
  trainNumber?: string;
  departureTime?: string;
  meetingLink?: string;
  estimatedMins?: number; // Optional time estimate
  categoryId?: string; // Optional category assignment
}

// DTO for updating an existing task — all fields are optional (PATCH semantics)
export type UpdateTaskDto = Partial<CreateTaskDto>;

// Static lookup table for plan types — provides display metadata (label, icon, color)
// used by the task list, task form type selector, dashboard timeline, and calendar chips.
export const PLAN_TYPES: { value: PlanType; label: string; icon: string; color: string }[] = [
  { value: 'task',     label: 'Task',     icon: '✓', color: '#3b82f6' }, // Blue — general to-do items
  { value: 'trip',     label: 'Trip',     icon: '✈', color: '#10b981' }, // Green — travel plans
  { value: 'train',    label: 'Journey',  icon: '🚌', color: '#6366f1' }, // Indigo — bus/train travel
  { value: 'dinner',   label: 'Food',     icon: '🍴', color: '#f97316' }, // Orange — lunch/dinner/breakfast/snacks
  { value: 'meeting',  label: 'Meeting',  icon: '👥', color: '#8b5cf6' }, // Purple — meetings/calls
  { value: 'event',    label: 'Event',    icon: '📅', color: '#06b6d4' }, // Cyan — generic events
  { value: 'reminder', label: 'Reminder', icon: '🔔', color: '#eab308' }, // Yellow — reminders/alerts
];
