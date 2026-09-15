import { type DataSourceOptions } from 'typeorm';

import { UserCredentialEntityFixture } from './entities/user-credential.entity.fixture.js';
import { UserEntityFixture } from './entities/user.entity.fixture.js';

export const ormConfig: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [UserEntityFixture, UserCredentialEntityFixture],
};
