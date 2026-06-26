import { IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShowSectionsDto {
  @IsOptional() @IsBoolean() skills?: boolean;
  @IsOptional() @IsBoolean() education?: boolean;
  @IsOptional() @IsBoolean() experience?: boolean;
  @IsOptional() @IsBoolean() certifications?: boolean;
  @IsOptional() @IsBoolean() achievements?: boolean;
  @IsOptional() @IsBoolean() interests?: boolean;
  @IsOptional() @IsBoolean() projects?: boolean;
}

export class UpsertSettingsDto {
  @IsOptional() @IsIn(['classic', 'minimal', 'developer']) theme?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @ValidateNested() @Type(() => ShowSectionsDto) showSections?: ShowSectionsDto;
}
