import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertBasicsDto {
  @IsOptional() @IsString() @MaxLength(60) slug?: string;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() @MaxLength(80) location?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() resumeUrl?: string;
  @IsOptional() @IsBoolean() availableForHire?: boolean;
  @IsOptional() @IsBoolean() published?: boolean;
  @IsOptional() @IsString() updatedAt?: string;
  @IsOptional() @IsString() createdAt?: string;
}
