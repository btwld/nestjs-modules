import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notes')
export class NoteEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'revision_id', nullable: false })
  revisionId!: number;
}
