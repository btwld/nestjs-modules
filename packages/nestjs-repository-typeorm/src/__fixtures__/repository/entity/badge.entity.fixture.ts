import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { CommonSqliteEntity } from '../../../sqlite/entities/common-sqlite.entity.js';

/**
 * An eager relation's target whose class initializes fields TypeORM's
 * constructor then puts on every badge it loads: `parent`, a to-one
 * relation, and `shown`, not a column at all.
 */
@Entity()
export class BadgeEntityFixture extends CommonSqliteEntity {
  @Column()
  label!: string;

  @Column({ type: 'varchar', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => BadgeEntityFixture, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: BadgeEntityFixture | null = null;

  shown = true;
}
