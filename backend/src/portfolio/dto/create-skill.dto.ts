import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
const LEVELS = ['beginner','intermediate','advanced','expert'] as const;

export class CreateSkillDto {
  @IsString() @MaxLength(60) name: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsIn(LEVELS) level?: string;
  @IsOptional() @IsNumber() @Min(0) yearsOfExperience?: number;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsNumber() order?: number;
}
