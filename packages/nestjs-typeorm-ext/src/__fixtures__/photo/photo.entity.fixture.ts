import {
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReferenceId } from '@concepta/nestjs-common';
import { PhotoEntityInterfaceFixture } from './interfaces/photo-entity.interface.fixture';

@Entity()
export class PhotoEntityFixture implements PhotoEntityInterfaceFixture {
  @PrimaryGeneratedColumn('uuid')
  id!: ReferenceId;

  @Column({ length: 500 })
  name!: string;

  @Column('text')
  description!: string;

  @Column('text')
  filename!: string;

  @Column('int', { default: 0 })
  views = 0;

  @Column('boolean')
  isPublished = true;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null = null;
}
