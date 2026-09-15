import { Column, Entity, Unique } from 'typeorm';

import { FileEntityInterface } from '@concepta/nestjs-common';

import { CommonPostgresEntity } from './common-postgres.entity';

/**
 * File Postgres Entity
 */
@Entity()
@Unique(['serviceKey', 'fileName'])
export class FilePostgresEntity
  extends CommonPostgresEntity
  implements FileEntityInterface
{
  /**
   * serviceKey ( aws, filesystem, firebase, etc )
   */
  @Column()
  serviceKey!: string;

  /**
   * File name (including path)
   */
  @Column()
  fileName!: string;

  /**
   * Content type
   */
  @Column()
  contentType!: string;
}
