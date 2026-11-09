import { Column, Entity } from 'typeorm';

import { CommonSqlServerEntity } from '../../sqlserver/entities/common-sqlserver.entity.js';

@Entity('session_context_order')
export class SessionContextOrderEntityFixture extends CommonSqlServerEntity {
  @Column({ name: 'tenant_id', type: 'nvarchar', length: 36 })
  tenantId!: string;

  @Column({ type: 'nvarchar', length: 50 })
  name!: string;
}
