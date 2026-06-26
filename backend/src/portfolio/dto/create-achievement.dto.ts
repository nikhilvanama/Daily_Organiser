import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAchievementDto {
  @IsString() @MaxLength(120) title: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(10) date?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsNumber() order?: number;
}
