import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A composite primary key whose second column has a database default. */
@Entity()
export class DocEntityFixture {
  @PrimaryColumn()
  slug!: string;

  @PrimaryColumn({ default: 'en' })
  locale!: string;

  @Column()
  body!: string;
}
