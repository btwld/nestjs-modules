import { Column, Unique } from 'typeorm';
import { ReferenceId } from '@concepta/nestjs-common';
import { CacheInterface } from '@concepta/nestjs-common';
import { CommonPostgresEntity } from '@concepta/typeorm-common';

/**
 * Cache Postgres Entity
 */
@Unique(['key', 'type', 'assigneeId'])
export abstract class CachePostgresEntity
  extends CommonPostgresEntity
  implements CacheInterface
{
  @Column()
  type!: string;

  @Column()
  key!: string;

  @Column({ type: 'jsonb', nullable: true })
  data!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expirationDate!: Date | null;

  @Column({ type: 'uuid' })
  assigneeId!: ReferenceId;
}
