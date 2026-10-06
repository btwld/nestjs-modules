import { type DataSourceOptions } from 'typeorm';

import { TestEntityFixture } from '../entity/test.entity.fixture.js';

export const ormConfig: DataSourceOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  synchronize: true,
  entities: [TestEntityFixture],
};
