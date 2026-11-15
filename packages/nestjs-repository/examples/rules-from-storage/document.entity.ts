import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  body!: string;
}
