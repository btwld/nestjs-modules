import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * A scoped entity with a **composite primary key whose second column has a
 * database default**.
 *
 * The shape exists to prove a partial key is refused. An `upsert` supplying
 * only `slug` cannot be looked up, so treating it as an insert would be
 * unsafe: the driver conflicts on the real primary columns, the default fills
 * in `locale`, the conflict fires, and another tenant's row is both
 * overwritten and re-scoped. A partial key is refused rather than assumed
 * harmless.
 */
@Entity()
export class DocEntityFixture {
  @PrimaryColumn()
  slug!: string;

  @PrimaryColumn({ default: 'en' })
  locale!: string;

  @Column()
  tenantId!: string;

  @Column()
  body!: string;
}
