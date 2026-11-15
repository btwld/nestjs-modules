import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('order')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  customer!: string;

  /** What the customer pays, in cents. */
  @Column({ type: 'integer' })
  total!: number;

  /** What the order costs the business, in cents. */
  @Column({ type: 'integer' })
  cost!: number;

  @Column({ type: 'varchar', default: 'open' })
  status!: string;
}
