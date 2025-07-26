import { Expose } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class ProjectCreateDto {
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name!: string;

  @Expose()
  @IsOptional()
  description?: string;

  @Expose()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Expose()
  @IsOptional()
  @IsNumber()
  companyId?: number;
}
