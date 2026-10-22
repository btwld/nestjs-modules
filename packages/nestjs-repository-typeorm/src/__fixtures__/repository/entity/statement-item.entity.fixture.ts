import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppendOnlySqliteEntity } from '../../../entities/append-only/append-only-sqlite.entity.js';

@Entity()
@Index(['correctedId'], { unique: true })
export class StatementItemEntityFixture extends AppendOnlySqliteEntity {
  @Column({ type: 'varchar', nullable: true })
  correctedId!: string | null;

  @ManyToOne(() => StatementItemEntityFixture, { nullable: true })
  @JoinColumn({ name: 'correctedId' })
  corrected?: StatementItemEntityFixture | null;

  @Column({ type: 'varchar', nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar' })
  amount!: string;
}
