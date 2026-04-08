// Import class-validator decorators to validate the goal creation request body
// IsDateString validates ISO 8601 date format for targetDate
// IsOptional marks fields as not required
// IsString ensures string type for text fields
// MaxLength limits title length
import { IsArray, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resources?: string[];
}
