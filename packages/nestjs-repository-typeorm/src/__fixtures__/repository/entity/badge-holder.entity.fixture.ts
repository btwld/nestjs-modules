import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { CommonSqliteEntity } from '../../../sqlite/entities/common-sqlite.entity.js';

import { BadgeEntityFixture } from './badge.entity.fixture.js';

/** Loads its badge eagerly. */
@Entity()
export class BadgeHolderEntityFixture extends CommonSqliteEntity {
  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  badgeId!: string | null;

  @ManyToOne(() => BadgeEntityFixture, { eager: true, nullable: true })
  @JoinColumn({ name: 'badgeId' })
  badge?: BadgeEntityFixture | null;
}
