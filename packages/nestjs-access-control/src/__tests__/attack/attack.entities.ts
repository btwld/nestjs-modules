import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A customer, shared by every tenant. */
@Entity('attack_customer')
export class AttackCustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  /** How much the customer may owe, in cents. Collections only. */
  @Column({ type: 'integer' })
  creditLimit!: number;
}

/** An invoice, in one tenant, written with its lines. */
@Entity('attack_invoice')
export class AttackInvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  number!: string;

  /** In cents. */
  @Column({ type: 'integer' })
  amount!: number;

  /** For managers only. */
  @Column({ type: 'text', default: '' })
  internalNotes!: string;

  @Column({ type: 'varchar' })
  customerId!: string;

  @ManyToOne(() => AttackCustomerEntity)
  @JoinColumn({ name: 'customerId' })
  customer?: AttackCustomerEntity;

  @OneToMany(() => AttackInvoiceLineEntity, (line) => line.invoice)
  lines?: AttackInvoiceLineEntity[];

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}

/** A line of an invoice, in the invoice's tenant. */
@Entity('attack_invoice_line')
export class AttackInvoiceLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  invoiceId!: string;

  @ManyToOne(() => AttackInvoiceEntity, (invoice) => invoice.lines)
  @JoinColumn({ name: 'invoiceId' })
  invoice?: AttackInvoiceEntity;

  @Column({ type: 'varchar' })
  sku!: string;

  /** In cents. */
  @Column({ type: 'integer' })
  amount!: number;

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}
