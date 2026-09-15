import { Exclude, Expose, Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { AuditInterface } from '../interfaces/audit.interface';
import {
  AuditDateCreated,
  AuditDateDeleted,
  AuditDateUpdated,
} from '../interfaces/audit.types';

/**
 * Audit DTO
 */
@Exclude()
export class AuditDto implements AuditInterface {
  /**
   * Date created
   */
  @Expose()
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'Date created',
  })
  @Type(() => Date)
  @IsDate()
  dateCreated!: AuditDateCreated;

  /**
   * Date updated
   */
  @Expose()
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'Date updated',
  })
  @Type(() => Date)
  @IsDate()
  dateUpdated!: AuditDateUpdated;

  /**
   * Date deleted
   */
  @Expose()
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'Date deleted',
    nullable: true,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dateDeleted!: AuditDateDeleted;
}
