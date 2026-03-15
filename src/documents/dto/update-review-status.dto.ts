import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateReviewStatusDto {
  @IsIn(['PENDING', 'APPROVED', 'NEEDS_REVIEW', 'REPORTED'])
  reviewStatus!: string;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
