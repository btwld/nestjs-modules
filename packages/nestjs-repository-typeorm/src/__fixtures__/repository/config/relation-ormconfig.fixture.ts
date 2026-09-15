import { type DataSourceOptions } from 'typeorm';

import { AuthorEntityFixture } from '../entity/author.entity.fixture.js';
import { PostEntityFixture } from '../entity/post.entity.fixture.js';
import { TagEntityFixture } from '../entity/tag.entity.fixture.js';

export const relationOrmConfig: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [AuthorEntityFixture, PostEntityFixture, TagEntityFixture],
};
