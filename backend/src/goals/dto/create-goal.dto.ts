// Import class-validator decorators to validate the goal creation request body
// IsDateString validates ISO 8601 date format for targetDate
// IsOptional marks fields as not required
// IsString ensures string type for text fields
// MaxLength limits title length
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the POST /goals request body
export class CreateGoalDto {
  // Validates that the title is a string type (required field - the name of the goal)
  @IsString()
  // Enforces a maximum of 200 characters for the goal title
  @MaxLength(200)
  title: string;

  // Marks description as optional; goals can be created without a detailed description
  @IsOptional()
  // Validates that description is a string if provided
  @IsString()
  description?: string;

  // Marks status as optional; defaults to 'ACTIVE' in the service if not provided
  @IsOptional()
  // Validates that status is a string if provided (values: ACTIVE, COMPLETED, PAUSED)
  @IsString()
  status?: string;

  // Marks targetDate as optional; goals can exist without a specific deadline
  @IsOptional()
  // Validates that targetDate follows ISO 8601 date format (e.g., "2026-12-31")
  @IsDateString()
  targetDate?: string;
}
