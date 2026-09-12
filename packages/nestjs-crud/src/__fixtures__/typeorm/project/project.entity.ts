import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../base-entity.js';
import { CompanyEntity } from '../company/company.entity.js';

@Entity('projects')
export class ProjectEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive?: boolean;

  @Column({ nullable: false })
  companyId?: number;

  @ManyToOne(() => CompanyEntity, (company) => company.projects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company?: CompanyEntity;
}
