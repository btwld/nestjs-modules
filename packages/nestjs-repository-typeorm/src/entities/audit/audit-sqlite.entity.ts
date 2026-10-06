import {
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import {
  AuditDateCreated,
  AuditDateDeleted,
  AuditDateUpdated,
  AuditInterface,
  AuditVersion,
} from '@concepta/nestjs-core';

/**
 * Audit Sqlite
 */
export abstract class AuditSqliteEntity implements AuditInterface {
  /**
   * Date created.
   */
  @CreateDateColumn({ type: 'datetime' })
  dateCreated!: AuditDateCreated;

  /**
   * Date updated.
   */
  @UpdateDateColumn({ type: 'datetime' })
  dateUpdated!: AuditDateUpdated;

  /**
   * Date deleted.
   */
  @DeleteDateColumn({ type: 'datetime' })
  dateDeleted!: AuditDateDeleted;

  /**
   * Version
   */
  @VersionColumn({ type: 'integer' })
  version!: AuditVersion;
}
