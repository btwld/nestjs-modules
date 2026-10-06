import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { OrderEntityFixture } from './order.entity.fixture.js';

/**
 * A scoped entity whose **primary key is itself a join column** — the owned
 * one-to-one shape, and the same shape a junction row takes.
 *
 * The shape exists to prove the key is read through the driver's own
 * materialization. A driver resolves `orderId` from the `order` relation when
 * the scalar is absent, and prefers it, so a guard reading only
 * `value.orderId` would see no key at all — leaving
 * `create({ order: { id: <other tenant's> } })` free to overwrite and
 * re-tenant that row, and `update(own, { order: { id: <other tenant's> } })`
 * free to redirect the write onto a row the target check never saw.
 */
@Entity()
export class ProfileEntityFixture {
  @PrimaryColumn()
  orderId!: string;

  @OneToOne(() => OrderEntityFixture)
  @JoinColumn({ name: 'orderId' })
  order!: OrderEntityFixture;

  @Column()
  tenantId!: string;

  @Column()
  bio!: string;
}
