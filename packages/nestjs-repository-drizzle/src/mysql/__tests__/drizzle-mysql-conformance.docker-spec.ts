import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { DrizzleMysqlRepositoryModule } from '../drizzle-mysql-repository.module.js';

import { drizzleMysqlConformanceHarness } from '../__fixtures__/conformance-mysql-harness.fixture.js';

runRepositoryConformance(
  drizzleMysqlConformanceHarness(
    'drizzle-mysql/mysql',
    DrizzleMysqlRepositoryModule,
    process.env.MYSQL_URL ?? 'mysql://root:mysql@localhost:53306/rockets_test',
  ),
  { describe, it, beforeAll, afterAll, beforeEach },
);
