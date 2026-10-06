import { type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { PhotoFixture } from './photo/photo.entity.fixture.js';

const config: TypeOrmModuleOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  synchronize: true,
  entities: [PhotoFixture],
};

export default config;
