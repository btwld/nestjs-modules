import { Column, Entity, OneToMany } from 'typeorm';

import { CommonSqliteEntity } from '../../../entities/common/common-sqlite.entity.js';

import { PostEntityFixture } from './post.entity.fixture.js';

@Entity()
export class AuthorEntityFixture extends CommonSqliteEntity {
  @Column()
  name!: string;

  @OneToMany(() => PostEntityFixture, (post) => post.author)
  posts!: PostEntityFixture[];
}
