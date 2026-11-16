import { PrimaryGeneratedColumn } from 'typeorm';

import { AuditInterface, ReferenceIdInterface } from '@concepta/nestjs-core';

import { AuditMysqlEntity } from './audit-mysql.entity.js';

export abstract class CommonMysqlEntity
  extends AuditMysqlEntity
  implements ReferenceIdInterface, AuditInterface
{
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
