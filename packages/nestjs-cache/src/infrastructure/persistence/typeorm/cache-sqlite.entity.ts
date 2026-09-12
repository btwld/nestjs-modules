import { Column, Unique } from 'typeorm';

import { ReferenceId } from '@concepta/nestjs-core';
import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { CacheInterface } from '../../../domain/interfaces/cache.interface.js';

/**
 * Cache Sqlite Entity
 */

@Unique(['key', 'type', 'assigneeId'])
export abstract class CacheSqliteEntity
  extends CommonSqliteEntity
  implements CacheInterface
{
  @Column()
  key!: string;

  @Column()
  type!: string;

  @Column({ type: 'text', nullable: true })
  data!: string;

  @Column({ type: 'datetime', nullable: true })
  expirationDate!: Date | null;

  @Column({ type: 'uuid' })
  assigneeId!: ReferenceId;
}
