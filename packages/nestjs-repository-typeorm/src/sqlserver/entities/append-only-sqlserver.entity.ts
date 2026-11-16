import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

import {
  type AuditDateCreated,
  type ReferenceIdInterface,
} from '@concepta/nestjs-core';

/**
 * Base entity for an append-only table (SQL Server).
 *
 * A generated id and a creation date, and nothing that implies a row can
 * change. Extend this rather than `AuditSqlServerEntity` or
 * `CommonSqlServerEntity`, whose delete-date column is refused on an
 * append-only entity at startup.
 *
 * Never take the `id` from the request; an id the application generates is
 * fine. Two concurrent creates with the same request-supplied `id` can both
 * pass `create`'s existence check, and the second can overwrite the first.
 */
export abstract class AppendOnlySqlServerEntity implements ReferenceIdInterface {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'datetimeoffset' })
  dateCreated!: AuditDateCreated;
}
