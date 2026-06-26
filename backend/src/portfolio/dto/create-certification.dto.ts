import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCertificationDto {
  @IsString() @MaxLength(120) name: string;
  @IsString() @MaxLength(100) issuer: string;
  @IsOptional() @IsString() @MaxLength(10) issuedDate?: string;
  @IsOptional() @IsString() @MaxLength(10) expiryDate?: string;
  @IsOptional() @IsString() credentialUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) credentialId?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsNumber() order?: number;
}
