import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { CommonSqliteEntity } from '../../../sqlite/entities/common-sqlite.entity.js';

import { BadgeHolderEntityFixture } from './badge-holder.entity.fixture.js';

/** Loads its holder eagerly, and TypeORM the holder's badge with it. */
@Entity()
export class RibbonEntityFixture extends CommonSqliteEntity {
  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  holderId!: string | null;

  @ManyToOne(() => BadgeHolderEntityFixture, { eager: true, nullable: true })
  @JoinColumn({ name: 'holderId' })
  holder?: BadgeHolderEntityFixture | null;
}
