import { Column, Entity } from 'typeorm';

import { CommonOracleEntity } from '../../oracle/entities/common-oracle.entity.js';

@Entity('vpd_order')
export class VpdOrderEntityFixture extends CommonOracleEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ type: 'varchar' })
  name!: string;
}
