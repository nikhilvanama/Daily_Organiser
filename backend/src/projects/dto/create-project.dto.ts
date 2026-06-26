import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Project status is now ONLY about the work itself — payment is tracked separately.
// Old records may still have status 'PAID'; service migrates those to 'DELIVERED' on read.
export const PROJECT_STATUSES = ['LEAD', 'QUOTED', 'IN_PROGRESS', 'DELIVERED', 'LOST', 'ON_HOLD'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PAYMENT_STATUSES = ['NOT_INVOICED', 'PENDING', 'PARTIAL', 'PAID', 'NOT_APPLICABLE'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export class CreateProjectDto {
  @IsString()
  @MaxLength(160)
  title: string;

  // Self projects (personal work) skip client + payment fields.
  @IsOptional()
  @IsBoolean()
  isSelf?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  projectType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(PROJECT_STATUSES)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(PAYMENT_STATUSES)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quotedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  portfolioLinks?: string[];

  @IsOptional()
  @IsBoolean()
  showInPortfolio?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  publicSummary?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  liveUrl?: string;

  @IsOptional()
  @IsString()
  repoUrl?: string;

  @IsOptional()
  @IsString()
  figmaUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
