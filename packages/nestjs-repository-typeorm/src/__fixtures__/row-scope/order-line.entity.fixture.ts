import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { CommonSqliteEntity } from '../../entities/common/common-sqlite.entity.js';

import { OrderEntityFixture } from './order.entity.fixture.js';

/**
 * A second scoped entity, so the fixture can exercise the pattern where one
 * resolver checks a foreign key against a *peer* scoped repository.
 *
 * The relation and the scalar `orderId` write the same column, which is the
 * point: a resolver checking only the scalar leaves the relation route open.
 */
@Entity()
export class OrderLineEntityFixture extends CommonSqliteEntity {
  @Column()
  tenantId!: string;

  @Column()
  sku!: string;

  @Column()
  orderId!: string;

  @ManyToOne(() => OrderEntityFixture)
  @JoinColumn({ name: 'orderId' })
  order!: OrderEntityFixture;
}
