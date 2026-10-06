import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';

import { BaseEntity } from '../base-entity.js';
import { ProjectEntity } from '../project/project.entity.js';
import { UserEntity } from '../users/user.entity.js';

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

  @OneToMany(() => UserEntity, (user) => user.company)
  users?: UserEntity[];

  @OneToMany(() => ProjectEntity, (project) => project.company)
  projects?: ProjectEntity[];
}
