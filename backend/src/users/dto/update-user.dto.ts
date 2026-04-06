import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  isEmployed?: any;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  officeStartTime?: string;

  @IsOptional()
  @IsString()
  officeEndTime?: string;

  @IsOptional()
  weekendDays?: any;

  @IsOptional()
  syncOfficeToCalendar?: any;
}
