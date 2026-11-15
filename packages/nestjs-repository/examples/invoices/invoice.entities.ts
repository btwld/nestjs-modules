import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A customer, shared by every tenant. */
@Entity('customer')
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  /** How much the customer may owe, in cents. Collections only. */
  @Column({ type: 'integer' })
  creditLimit!: number;
}

/** An invoice, in one tenant, written with its lines. */
@Entity('invoice')
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  number!: string;

  @Column({ type: 'varchar' })
  customerId!: string;

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customerId' })
  customer?: CustomerEntity;

  @OneToMany(() => InvoiceLineEntity, (line) => line.invoice)
  lines?: InvoiceLineEntity[];
}

@Entity('invoice_line')
export class InvoiceLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  invoiceId!: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.lines)
  @JoinColumn({ name: 'invoiceId' })
  invoice?: InvoiceEntity;

  @Column({ type: 'varchar' })
  sku!: string;

  /** In cents. */
  @Column({ type: 'integer' })
  amount!: number;
}
