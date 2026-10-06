import { Column, Entity } from 'typeorm';

import { CommonSqliteEntity } from '../../entities/common/common-sqlite.entity.js';

@Entity()
export class OrderEntityFixture extends CommonSqliteEntity {
  @Column()
  tenantId!: string;

  @Column()
  description!: string;
}
