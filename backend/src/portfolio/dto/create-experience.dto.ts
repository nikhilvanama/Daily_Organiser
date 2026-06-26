import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
const TYPES = ['fulltime','parttime','internship','freelance','contract','volunteer'] as const;

export class CreateExperienceDto {
  @IsString() @MaxLength(100) company: string;
  @IsString() @MaxLength(100) role: string;
  @IsOptional() @IsIn(TYPES) type?: string;
  @IsOptional() @IsString() @MaxLength(10) startDate?: string;
  @IsOptional() @IsString() @MaxLength(10) endDate?: string;
  @IsOptional() @IsBoolean() current?: boolean;
  @IsOptional() @IsString() @MaxLength(80) location?: string;
  @IsOptional() @IsBoolean() remote?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) achievements?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tech?: string[];
  @IsOptional() @IsString() companyUrl?: string;
  @IsOptional() @IsNumber() order?: number;
}
