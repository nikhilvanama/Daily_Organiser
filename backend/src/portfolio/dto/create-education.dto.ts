import { IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEducationDto {
  @IsString() @MaxLength(120) institution: string;
  @IsOptional() @IsString() @MaxLength(80) degree?: string;
  @IsOptional() @IsString() @MaxLength(80) field?: string;
  @IsOptional() @IsString() @MaxLength(10) startDate?: string;
  @IsOptional() @IsString() @MaxLength(10) endDate?: string;
  @IsOptional() @IsString() @MaxLength(30) grade?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) achievements?: string[];
  @IsOptional() @IsString() institutionUrl?: string;
  @IsOptional() @IsNumber() order?: number;
}
