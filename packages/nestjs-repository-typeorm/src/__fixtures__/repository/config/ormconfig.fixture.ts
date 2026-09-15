import { type DataSourceOptions } from 'typeorm';

import { TestEntityFixture } from '../entity/test.entity.fixture.js';

export const ormConfig: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [TestEntityFixture],
};
