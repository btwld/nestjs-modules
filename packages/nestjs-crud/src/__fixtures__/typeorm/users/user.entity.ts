import { Entity, Column, DeleteDateColumn } from 'typeorm';

import { BaseEntity } from '../base-entity';

export class NameEntity {
  @Column({ type: 'varchar', nullable: true })
  first!: string | null;

  @Column({ type: 'varchar', nullable: true })
  last!: string | null;
}

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  email!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column(() => NameEntity)
  name!: NameEntity;

  @Column({ nullable: true })
  profileId?: number | null;

  @Column({ nullable: false })
  companyId?: number;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
