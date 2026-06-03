import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const FOCUS_SESSION_TYPES = ['WORK', 'SHORT_BREAK', 'LONG_BREAK'] as const;
export type FocusSessionType = (typeof FOCUS_SESSION_TYPES)[number];

// Pomodoro sessions are logged AFTER they end. The frontend runs the actual timer;
// the backend just stores completed/abandoned sessions and aggregates them.
export class CreateFocusSessionDto {
  @IsEnum(FOCUS_SESSION_TYPES)
  type: FocusSessionType;

  @IsInt()
  @Min(1)
  plannedMinutes: number;

  @IsInt()
  @Min(0)
  actualMinutes: number;

  @IsBoolean()
  completed: boolean;

  @IsDateString()
  startedAt: string;

  @IsDateString()
  endedAt: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
