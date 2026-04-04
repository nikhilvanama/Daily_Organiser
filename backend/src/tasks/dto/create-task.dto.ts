// Import class-validator decorators for validating the task creation request body
// IsDateString validates ISO 8601 date format for dueDate
// IsEnum validates against a set of allowed values (not currently used but available for future type/priority enums)
// IsInt ensures estimatedMins is a whole number
// IsOptional marks fields as not required
// IsString ensures string type for text fields
// MaxLength limits title length
// Min ensures estimatedMins is at least 1
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the POST /tasks request body
// Supports multiple plan item types: tasks, trips, trains, dinners, meetings, events, and reminders
export class CreateTaskDto {
  // Validates that the title is a string type (required field - the name of the task/event)
  @IsString()
  // Enforces a maximum of 200 characters for the task title
  @MaxLength(200)
  title: string;

  // Marks description as optional; tasks can be created without a detailed description
  @IsOptional()
  // Validates that description is a string if provided
  @IsString()
  description?: string;

  // Marks type as optional; defaults to 'task' in the service if not provided
  @IsOptional()
  // Validates that type is a string if provided
  @IsString()
  type?: string; // task, trip, train, dinner, meeting, event, reminder

  // Marks priority as optional; defaults to 'MEDIUM' in the service if not provided
  @IsOptional()
  // Validates that priority is a string if provided (values: LOW, MEDIUM, HIGH)
  @IsString()
  priority?: string;

  // Marks status as optional; defaults to 'TODO' in the service if not provided
  @IsOptional()
  // Validates that status is a string if provided (values: TODO, IN_PROGRESS, DONE)
  @IsString()
  status?: string;

  // Marks dueDate as optional; tasks without a due date won't appear in the today/upcoming views
  @IsOptional()
  // Validates that dueDate follows ISO 8601 date format (e.g., "2026-04-04T10:00:00.000Z")
  @IsDateString()
  dueDate?: string;

  // Marks startTime as optional; used for time-bound events like meetings, trains, and dinners
  @IsOptional()
  // Validates that startTime is a string (e.g., "09:00" or ISO timestamp)
  @IsString()
  startTime?: string;

  // Marks endTime as optional; used for time-bound events to define the end of the scheduled block
  @IsOptional()
  // Validates that endTime is a string (e.g., "10:00" or ISO timestamp)
  @IsString()
  endTime?: string;

  // Marks location as optional; useful for trips, dinners, and meetings that have a physical location
  @IsOptional()
  // Validates that location is a string if provided (e.g., "Restaurant XYZ", "Platform 3")
  @IsString()
  location?: string;

  // Marks estimatedMins as optional; used for time planning to estimate how long a task will take
  @IsOptional()
  // Validates that estimatedMins is a whole number (no decimals)
  @IsInt()
  // Enforces a minimum value of 1 minute for the estimate
  @Min(1)
  estimatedMins?: number;

  // Marks categoryId as optional; links the task to a user-defined category for color-coded organization
  @IsOptional()
  // Validates that categoryId is a string (UUID referencing a record in the categories collection)
  @IsString()
  categoryId?: string;
}
