import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('crud_invoice')
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  customer!: string;

  /** In cents. */
  @Column({ type: 'integer' })
  amount!: number;

  /** For managers only. */
  @Column({ type: 'text', default: '' })
  notes!: string;
}
