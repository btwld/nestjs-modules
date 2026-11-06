import { Column } from 'typeorm';

import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm/sqlite';

import { FileStatus } from '../../../domain/interfaces/file-status.type.js';
import { type FileEntityInterface } from '../interfaces/file-entity.interface.js';

/**
 * File Entity
 */
export abstract class FileSqliteEntity
  extends CommonSqliteEntity
  implements FileEntityInterface
{
  /**
   * Storage service key
   */
  @Column()
  serviceKey!: string;

  /**
   * Sanitized display name
   */
  @Column()
  fileName!: string;

  /**
   * Content type
   */
  @Column()
  contentType!: string;

  /**
   * Lifecycle status
   */
  @Column({ type: 'varchar' })
  status!: FileStatus;
}
