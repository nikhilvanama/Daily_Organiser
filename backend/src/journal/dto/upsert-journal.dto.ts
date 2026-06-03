import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertJournalDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @MaxLength(20000)
  body: string;

  // An emoji or short string representing the user's mood. Free-form so the
  // client can use whatever set it wants.
  @IsOptional()
  @IsString()
  @MaxLength(8)
  mood?: string;
}
