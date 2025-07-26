import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

export class CompanyDto {
  @Expose()
  @ApiProperty({ type: 'number' })
  id!: string;

  @Expose()
  @ApiProperty({ type: 'string' })
  name!: string;

  @Expose()
  @ApiProperty({ type: 'string' })
  domain!: string;

  @Expose()
  @ApiProperty({ type: 'string' })
  description!: string;

  @Exclude()
  createdAt!: string;

  @Exclude()
  updatedAt!: string;
}
