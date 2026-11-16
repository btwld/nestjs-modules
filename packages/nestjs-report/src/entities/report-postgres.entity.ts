import { Column, Entity, Unique } from 'typeorm';

import {
  ReferenceId,
  ReportStatusEnum,
  ReportEntityInterface,
} from '@concepta/nestjs-common';

import { CommonPostgresEntity } from './common-postgres.entity';

/**
 * Report Postgres Entity
 */
@Entity()
@Unique(['serviceKey', 'name'])
export class ReportPostgresEntity
  extends CommonPostgresEntity
  implements ReportEntityInterface
{
  @Column()
  serviceKey!: string;

  @Column({ type: 'citext' })
  name!: string;

  @Column({
    type: 'enum',
    enum: ReportStatusEnum,
  })
  status!: ReportStatusEnum;

  @Column({ type: 'text', nullable: true, default: null })
  errorMessage: string | null = null;

  @Column({ type: 'uuid', nullable: true, default: null })
  fileId!: ReferenceId;
}
