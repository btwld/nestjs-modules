import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
  VersionColumn,
} from 'typeorm';

import {
  type ConformanceAuthorInterface,
  type ConformanceBookInterface,
  type ConformanceBookWithEagerAuthorInterface,
  type ConformanceItemInterface,
  type ConformancePlainItemInterface,
  type ConformanceTagInterface,
  type ConformanceTenantOrderInterface,
  type ConformanceTenantOrderLineInterface,
} from '@concepta/nestjs-repository/conformance';

/** The conformance suite's fixtures as TypeORM entities. */

@Entity('conformance_item')
export class ConformanceItemEntity implements ConformanceItemInterface {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'integer', nullable: true })
  rank!: number | null;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;

  @DeleteDateColumn({ nullable: true })
  removedAt!: Date | null;

  @VersionColumn()
  version!: number;
}

@Entity('conformance_plain_item')
export class ConformancePlainItemEntity implements ConformancePlainItemInterface {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;
}

@Entity('conformance_author')
export class ConformanceAuthorEntity implements ConformanceAuthorInterface {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @DeleteDateColumn({ nullable: true })
  removedAt!: Date | null;

  @OneToMany(() => ConformanceBookEntity, (book) => book.author)
  books?: ConformanceBookEntity[];
}

/**
 * `author` is eager, but `book` is registered without
 * `allowEagerRelations`, so the driver must not load it.
 */
@Entity('conformance_book')
export class ConformanceBookEntity implements ConformanceBookInterface {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  authorId!: string | null;

  @DeleteDateColumn({ nullable: true })
  removedAt!: Date | null;

  @ManyToOne(() => ConformanceAuthorEntity, (author) => author.books, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'authorId' })
  author?: ConformanceAuthorEntity | null;

  @ManyToMany(() => ConformanceTagEntity, (tag) => tag.books)
  tags?: ConformanceTagEntity[];
}

@Entity('conformance_book_with_eager_author')
export class ConformanceBookWithEagerAuthorEntity implements ConformanceBookWithEagerAuthorInterface {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  authorId!: string | null;

  @DeleteDateColumn({ nullable: true })
  removedAt!: Date | null;

  @ManyToOne(() => ConformanceAuthorEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'authorId' })
  author?: ConformanceAuthorEntity | null;
}

@Entity('conformance_tag')
export class ConformanceTagEntity implements ConformanceTagInterface {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  label!: string;

  @ManyToMany(() => ConformanceBookEntity, (book) => book.tags)
  @JoinTable({
    name: 'conformance_book_tag',
    joinColumn: { name: 'tagId' },
    inverseJoinColumn: { name: 'bookId' },
  })
  books?: ConformanceBookEntity[];
}

@Entity('conformance_tenant_order')
@Unique(['tenantId', 'id'])
export class ConformanceTenantOrderEntity implements ConformanceTenantOrderInterface {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  tenantId!: string;

  @Column({ type: 'integer' })
  total!: number;

  @OneToMany(() => ConformanceTenantOrderLineEntity, (line) => line.order)
  lines?: ConformanceTenantOrderLineEntity[];
}

@Entity('conformance_tenant_order_line')
export class ConformanceTenantOrderLineEntity implements ConformanceTenantOrderLineInterface {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  orderId!: string;

  @Column({ type: 'integer' })
  qty!: number;

  @ManyToOne(() => ConformanceTenantOrderEntity, (order) => order.lines)
  @JoinColumn([
    { name: 'tenantId', referencedColumnName: 'tenantId' },
    { name: 'orderId', referencedColumnName: 'id' },
  ])
  order?: ConformanceTenantOrderEntity | null;
}

export const CONFORMANCE_ENTITIES = [
  ConformanceItemEntity,
  ConformancePlainItemEntity,
  ConformanceAuthorEntity,
  ConformanceBookEntity,
  ConformanceBookWithEagerAuthorEntity,
  ConformanceTagEntity,
  ConformanceTenantOrderEntity,
  ConformanceTenantOrderLineEntity,
];
