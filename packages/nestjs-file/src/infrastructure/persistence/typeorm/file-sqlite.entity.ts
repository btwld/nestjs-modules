import { Column, Unique } from 'typeorm';

import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { FileStatus } from '../../../domain/interfaces/file-status.type.js';
import { type FileEntityInterface } from '../interfaces/file-entity.interface.js';

/**
 * File Entity
 */
@Unique(['serviceKey', 'fileName'])
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
   * File name, including any path
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
