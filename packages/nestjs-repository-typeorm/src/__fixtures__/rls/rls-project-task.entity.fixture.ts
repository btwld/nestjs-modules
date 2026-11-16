import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** A tenant's project, unique by tenant and id so a task can reference both. */
@Entity('rls_project')
@Unique(['tenantId', 'id'])
export class RlsProjectEntityFixture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column()
  name!: string;

  @OneToMany(() => RlsTaskEntityFixture, (task) => task.project)
  tasks?: RlsTaskEntityFixture[];
}

/**
 * A user's task in a tenant. Its foreign key is `(tenantId, projectId)`, so
 * it can only point at a project in its own tenant.
 */
@Entity('rls_task')
export class RlsTaskEntityFixture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  projectId!: string;

  @Column()
  title!: string;

  @ManyToOne(() => RlsProjectEntityFixture, (project) => project.tasks)
  @JoinColumn([
    { name: 'tenantId', referencedColumnName: 'tenantId' },
    { name: 'projectId', referencedColumnName: 'id' },
  ])
  project?: RlsProjectEntityFixture;
}
