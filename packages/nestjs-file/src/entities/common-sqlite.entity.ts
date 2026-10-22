import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export abstract class CommonSqliteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'datetime' })
  dateCreated!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  dateUpdated!: Date;

  @DeleteDateColumn({ type: 'datetime' })
  dateDeleted!: Date | null;

  @VersionColumn({ type: 'integer' })
  version!: number;
}
