import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { CommonSqliteEntity } from '../../../entities/common/common-sqlite.entity.js';

import { AuthorEntityFixture } from './author.entity.fixture.js';
import { PostEntityFixture } from './post.entity.fixture.js';

/**
 * Versioned, with fields the class initializes, which TypeORM's constructor
 * puts on every row it builds:
 * - `status` — a column initialized to `'draft'`;
 * - `edited` — not a column at all;
 * - `post` — loaded eagerly and initialized to `null` by the class, so both
 *   come back when a versioned update re-reads the row;
 * - `reviewer` — no foreign key column of its own, so TypeORM keeps the key
 *   in the relation property. The repository refuses such an entity at
 *   startup; it is here to pin how the driver reports it. Specs using this
 *   fixture do not start the application.
 */
@Entity()
export class CommentEntityFixture extends CommonSqliteEntity {
  @Column({ type: 'varchar', nullable: true })
  body!: string | null;

  @Column({ type: 'varchar', nullable: true })
  postId!: string | null;

  @Column({ type: 'varchar', default: 'draft' })
  status: string = 'draft';

  edited = false;

  @ManyToOne(() => PostEntityFixture, { eager: true, nullable: true })
  @JoinColumn({ name: 'postId' })
  post: PostEntityFixture | null = null;

  @ManyToOne(() => AuthorEntityFixture, { nullable: true })
  @JoinColumn({ name: 'reviewerId' })
  reviewer?: AuthorEntityFixture | null;
}
