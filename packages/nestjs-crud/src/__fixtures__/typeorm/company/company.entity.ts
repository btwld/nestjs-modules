import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';

import { BaseEntity } from '../base-entity';

@Entity('companies')
export class CompanyEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  domain!: string;

  @Column({ type: 'text', nullable: true, default: null })
  description!: string;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
