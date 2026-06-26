import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
const PLATFORMS = ['github','linkedin','twitter','instagram','youtube','dribbble','behance','figma','website','other'] as const;

export class CreateSocialDto {
  @IsIn(PLATFORMS) platform: string;
  @IsString() url: string;
  @IsOptional() @IsString() @MaxLength(60) handle?: string;
}
