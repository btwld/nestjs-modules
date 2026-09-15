import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

import { CommonSqliteEntity } from '../../../entities/common/common-sqlite.entity.js';

import { PostEntityFixture } from './post.entity.fixture.js';

@Entity()
export class TagEntityFixture extends CommonSqliteEntity {
  @Column()
  label!: string;

  @ManyToMany(() => PostEntityFixture, (post) => post.tags)
  @JoinTable({ name: 'post_tags' })
  posts!: PostEntityFixture[];
}
