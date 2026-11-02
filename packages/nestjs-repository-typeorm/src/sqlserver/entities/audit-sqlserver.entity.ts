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
 * Audit SQL Server
 */
export abstract class AuditSqlServerEntity implements AuditInterface {
  /**
   * Date created.
   */
  @CreateDateColumn({ type: 'datetimeoffset' })
  dateCreated!: AuditDateCreated;

  /**
   * Date updated.
   */
  @UpdateDateColumn({ type: 'datetimeoffset' })
  dateUpdated!: AuditDateUpdated;

  /**
   * Date deleted.
   */
  @DeleteDateColumn({ type: 'datetimeoffset' })
  dateDeleted!: AuditDateDeleted;

  /**
   * Version
   */
  @VersionColumn({ type: 'integer' })
  version!: AuditVersion;
}
