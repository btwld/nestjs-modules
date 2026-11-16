import { type DataSourceOptions } from 'typeorm';

import { FileEntityFixture } from './entities/file.entity.fixture.js';

export const ormConfig: DataSourceOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  synchronize: true,
  entities: [FileEntityFixture],
};
