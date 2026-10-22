import { Column } from 'typeorm';

import { ReferenceId } from '@concepta/nestjs-core';
import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { OtpInterface } from '../../../domain/interfaces/otp.interface.js';

/**
 * Otp Sqlite Entity
 */
export abstract class OtpSqliteEntity
  extends CommonSqliteEntity
  implements OtpInterface
{
  @Column()
  category!: string;

  @Column({ nullable: true })
  type!: string;

  @Column()
  passcode!: string;

  @Column({ type: 'datetime' })
  expirationDate!: Date;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'uuid' })
  assigneeId!: ReferenceId;
}
