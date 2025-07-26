import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CompanyCreateDto {
  @Expose()
  @ApiProperty({ type: 'string' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @Expose()
  @ApiProperty({ type: 'string' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  domain!: string;

  @Expose()
  @ApiProperty({ type: 'string' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  description!: string;
}
