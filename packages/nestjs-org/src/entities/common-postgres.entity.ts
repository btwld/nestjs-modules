import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export abstract class CommonPostgresEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  dateUpdated!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  dateDeleted!: Date | null;

  @VersionColumn({ type: 'integer' })
  version!: number;
}
