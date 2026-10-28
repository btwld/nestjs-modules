import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A row with no version column, so nothing guards a write against a stale read. */
@Entity()
export class NoteEntityFixture {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  body!: string;
}
