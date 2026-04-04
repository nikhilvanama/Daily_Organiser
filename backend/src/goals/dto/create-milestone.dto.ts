// Import class-validator decorators to validate the milestone creation request body
// IsDateString validates ISO 8601 date format for dueDate
// IsInt ensures order is a whole number for sorting milestones
// IsOptional marks fields as not required
// IsString ensures string type for text fields
// MaxLength limits title length
// Min ensures order is non-negative
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Data Transfer Object that defines and validates the shape of the POST /goals/:id/milestones request body
// Milestones are checkpoints within a goal that track progress toward the larger objective
export class CreateMilestoneDto {
  // Validates that the title is a string type (required field - describes what this milestone represents)
  @IsString()
  // Enforces a maximum of 200 characters for the milestone title
  @MaxLength(200)
  title: string;

  // Marks description as optional; milestones can be created with just a title
  @IsOptional()
  // Validates that description is a string if provided
  @IsString()
  description?: string;

  // Marks dueDate as optional; milestones can exist without a specific deadline
  @IsOptional()
  // Validates that dueDate follows ISO 8601 date format (e.g., "2026-06-15")
  @IsDateString()
  dueDate?: string;

  // Marks order as optional; defaults to 0 in the service if not provided
  @IsOptional()
  // Validates that order is a whole number (no decimals) for sequential display of milestones within a goal
  @IsInt()
  // Enforces a minimum value of 0 for the display order
  @Min(0)
  order?: number;
}
