import { Column, Entity } from 'typeorm';

import { CommonSqliteEntity } from '../../../entities/common/common-sqlite.entity.js';

/**
 * An append-only candidate built on the audited base, which brings a
 * soft-delete column with it — the misconfiguration the write-policy boot
 * check refuses.
 */
@Entity()
export class AuditedStatementItemEntityFixture extends CommonSqliteEntity {
  @Column({ type: 'varchar' })
  amount!: string;
}
