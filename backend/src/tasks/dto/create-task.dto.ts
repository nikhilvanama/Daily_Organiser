import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string; // task, trip, train, dinner, meeting, event, reminder

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // Common date/time fields
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // Trip-specific: end date for multi-day trips
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Train-specific
  @IsOptional()
  @IsString()
  boardingStation?: string;

  @IsOptional()
  @IsString()
  destinationStation?: string;

  @IsOptional()
  @IsString()
  trainNumber?: string;

  @IsOptional()
  @IsString()
  departureTime?: string;

  // Meeting-specific
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMins?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
