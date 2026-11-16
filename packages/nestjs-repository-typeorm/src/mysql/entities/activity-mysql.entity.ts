import { Column, Index } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  type ActivityInterface,
  type ActivityOperation,
} from '@concepta/nestjs-repository';

import { AppendOnlyMysqlEntity } from './append-only-mysql.entity.js';

/**
 * Base entity for an activity store (MySQL): every column of
 * `ActivityInterface`, on an append-only row.
 *
 * `actorId` is never set by the repository. Fill it, and any column you add,
 * with a hook on the store.
 *
 * Indexed on `(entityKey, recordId)`, so a row's history is one lookup.
 */
@Index(['entityKey', 'recordId'])
export abstract class ActivityMysqlEntity
  extends AppendOnlyMysqlEntity
  implements ActivityInterface
{
  @Column({ type: 'varchar', length: 255 })
  entityKey!: string;

  @Column({ type: 'varchar', length: 255 })
  urn!: string;

  @Column({ type: 'varchar', length: 255 })
  operation!: ActivityOperation;

  @Column({ type: 'varchar', length: 255 })
  recordId!: string;

  @Column({ type: 'json' })
  changed!: string[];

  @Column({ type: 'json', nullable: true })
  values!: PlainLiteralObject | null;

  @Column({ type: 'datetime', precision: 6 })
  occurredAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correlationId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorId!: string | null;
}
