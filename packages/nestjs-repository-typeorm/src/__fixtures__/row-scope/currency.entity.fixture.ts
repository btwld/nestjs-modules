import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Shared reference data — declared `{ access: 'public' }` rather than left
 * undeclared, so the decision is on the record and a scoped entity is allowed
 * to relate to it.
 */
@Entity()
export class CurrencyEntityFixture {
  @PrimaryColumn()
  code!: string;

  @Column()
  symbol!: string;
}
