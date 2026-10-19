import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** An order, unique by tenant and id so a line's foreign key can name both. */
@Entity()
@Unique(['tenantId', 'id'])
export class TenantOrderEntityFixture {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  tenantId!: string;

  @OneToMany(() => TenantOrderLineEntityFixture, (line) => line.order)
  lines?: TenantOrderLineEntityFixture[];
}

/**
 * A line whose foreign key is `(tenantId, orderId)`, so the join to its order
 * also matches the tenant.
 */
@Entity()
export class TenantOrderLineEntityFixture {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  tenantId!: string;

  @Column()
  orderId!: number;

  @ManyToOne(() => TenantOrderEntityFixture, (order) => order.lines)
  @JoinColumn([
    { name: 'tenantId', referencedColumnName: 'tenantId' },
    { name: 'orderId', referencedColumnName: 'id' },
  ])
  order?: TenantOrderEntityFixture;
}
