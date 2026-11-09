import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** An entity whose own listener stamps it on insert. */
@Entity()
export class ListenedEntityFixture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  stamp!: string | null;

  @BeforeInsert()
  stampOnInsert(): void {
    this.stamp = 'listener';
  }
}
