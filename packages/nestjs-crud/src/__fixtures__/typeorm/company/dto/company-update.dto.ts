import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyUpdateDto {
  @Expose()
  @ApiPropertyOptional({ type: 'string' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;
}
