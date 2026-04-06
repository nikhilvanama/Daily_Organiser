import { IsOptional, IsString, MaxLength, IsBoolean, IsArray } from 'class-validator';

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
  @IsBoolean()
  isEmployed?: boolean;

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
  @IsArray()
  weekendDays?: string[];

  @IsOptional()
  @IsBoolean()
  syncOfficeToCalendar?: boolean;
}
