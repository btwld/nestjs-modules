import { Entity, Column } from 'typeorm';

import { BaseEntity } from '../base-entity.js';

@Entity('user_profiles')
export class UserProfileEntity extends BaseEntity {
  @Column({ nullable: false })
  userId!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  favoriteColor?: string;
}
