import { PrimaryGeneratedColumn } from 'typeorm';

import { AuditInterface, ReferenceIdInterface } from '@concepta/nestjs-core';

import { AuditSqlServerEntity } from './audit-sqlserver.entity.js';

export abstract class CommonSqlServerEntity
  extends AuditSqlServerEntity
  implements ReferenceIdInterface, AuditInterface
{
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
