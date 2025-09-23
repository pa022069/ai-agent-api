import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumberString,
} from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsOptional()
  @IsString()
  assignees?: string;

  @IsOptional()
  @IsString()
  labels?: string;

  @IsNumberString()
  @IsOptional()
  milestone?: string;
}
