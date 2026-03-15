import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackReportDto {
  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  documentType?: string;
}
