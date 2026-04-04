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
  dueDate: string | null; // ISO date string for when this plan is scheduled (used in calendar view)
  startTime: string | null; // HH:mm start time — shown in the timeline and calendar day panel
  endTime: string | null; // HH:mm end time — paired with startTime for time-range display
  location: string | null; // Optional venue/place (e.g., "Office", "Grand Central Station")
  completedAt: string | null; // ISO timestamp when the task was marked DONE
  estimatedMins: number | null; // User's time estimate in minutes — shown in the detail view
  trackedMins: number; // Actual minutes tracked via the built-in timer feature
  isTimerActive: boolean; // Whether the task's timer is currently running
  timerStartAt: string | null; // ISO timestamp when the timer was last started (for elapsed calc)
  userId: string; // Foreign key to the owning user
  categoryId: string | null; // Optional foreign key to a user-defined category
  category: Category | null; // Populated category object (included via backend JOIN)
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
  dueDate?: string; // Optional scheduled date
  startTime?: string; // Optional start time
  endTime?: string; // Optional end time
  location?: string; // Optional location
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
  { value: 'train',    label: 'Train',    icon: '🚂', color: '#f59e0b' }, // Amber — commute/train schedules
  { value: 'dinner',   label: 'Dinner',   icon: '🍽', color: '#ec4899' }, // Pink — dinner reservations
  { value: 'meeting',  label: 'Meeting',  icon: '👥', color: '#8b5cf6' }, // Purple — meetings/calls
  { value: 'event',    label: 'Event',    icon: '📅', color: '#06b6d4' }, // Cyan — generic events
  { value: 'reminder', label: 'Reminder', icon: '🔔', color: '#f97316' }, // Orange — reminders/alerts
];
