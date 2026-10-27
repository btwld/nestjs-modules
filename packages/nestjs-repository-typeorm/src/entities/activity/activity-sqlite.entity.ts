import { Column, Index } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  type ActivityInterface,
  type ActivityOperation,
} from '@concepta/nestjs-repository';

import { AppendOnlySqliteEntity } from '../append-only/append-only-sqlite.entity.js';

/**
 * Base entity for an activity store (SQLite): every column of
 * `ActivityInterface`, on an append-only row.
 *
 * `actorId` is never set by the repository. Fill it, and any column you add,
 * with a hook on the store.
 *
 * Indexed on `(entityKey, recordId)`, so a row's history is one lookup.
 */
@Index(['entityKey', 'recordId'])
export abstract class ActivitySqliteEntity
  extends AppendOnlySqliteEntity
  implements ActivityInterface
{
  @Column({ type: 'varchar' })
  entityKey!: string;

  @Column({ type: 'varchar' })
  urn!: string;

  @Column({ type: 'varchar' })
  operation!: ActivityOperation;

  @Column({ type: 'varchar' })
  recordId!: string;

  @Column({ type: 'simple-json' })
  changed!: string[];

  @Column({ type: 'simple-json', nullable: true })
  values!: PlainLiteralObject | null;

  @Column({ type: 'datetime' })
  occurredAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  correlationId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorId!: string | null;
}
