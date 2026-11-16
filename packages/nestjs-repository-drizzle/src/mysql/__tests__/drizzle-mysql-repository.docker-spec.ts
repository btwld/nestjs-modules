import { DrizzleMysqlRepositoryModule } from '../drizzle-mysql-repository.module.js';

import { describeDrizzleMysqlRepository } from '../__fixtures__/drizzle-mysql-repository.fixture.js';

describeDrizzleMysqlRepository(
  'DrizzleMysqlRepository',
  DrizzleMysqlRepositoryModule,
  process.env.MYSQL_URL ?? 'mysql://root:mysql@localhost:53306/rockets_test',
);
