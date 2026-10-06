import { PrimaryGeneratedColumn } from 'typeorm';

import { AuditInterface, ReferenceIdInterface } from '@concepta/nestjs-core';

import { AuditPostgresEntity } from '../audit/audit-postgres.entity.js';

export abstract class CommonPostgresEntity
  extends AuditPostgresEntity
  implements ReferenceIdInterface, AuditInterface
{
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
