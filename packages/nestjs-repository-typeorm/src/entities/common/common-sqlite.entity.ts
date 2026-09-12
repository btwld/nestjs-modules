import { PrimaryGeneratedColumn } from 'typeorm';

import { AuditInterface, ReferenceIdInterface } from '@concepta/nestjs-core';

import { AuditSqliteEntity } from '../audit/audit-sqlite.entity.js';

export abstract class CommonSqliteEntity
  extends AuditSqliteEntity
  implements ReferenceIdInterface, AuditInterface
{
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
