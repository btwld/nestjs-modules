import { Entity, Column } from 'typeorm';

import { BaseEntity } from '../base-entity';

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
}
