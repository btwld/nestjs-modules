import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One CASL rule, for every actor with `actorKey`. */
@Entity('stored_rule')
export class StoredRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** `role:<name>` or `system:<name>`. */
  @Column({ type: 'varchar' })
  actorKey!: string;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'varchar' })
  subject!: string;

  @Column({ type: 'simple-json', nullable: true })
  fields!: string[] | null;

  @Column({ type: 'boolean', default: false })
  inverted!: boolean;

  /** Why a deny is in place, e.g. the decision it waits on. */
  @Column({ type: 'varchar', nullable: true })
  reason!: string | null;
}
