import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateConsentDto {
  @IsString() consentType!: string;
  @IsString() documentVersion!: string;
  @IsBoolean() accepted!: boolean;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() certificateId?: string;
}

export class CreateBulkConsentDto {
  consents!: CreateConsentDto[];
}
