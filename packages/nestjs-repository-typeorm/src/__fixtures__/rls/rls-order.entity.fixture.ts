import { Column, Entity } from 'typeorm';

import { CommonPostgresEntity } from '../../postgres/entities/common-postgres.entity.js';

@Entity('rls_order')
export class RlsOrderEntityFixture extends CommonPostgresEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column()
  name!: string;
}
