import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { drizzleMysqlConformanceHarness } from '../../mysql/__fixtures__/conformance-mysql-harness.fixture.js';
import { DrizzleMariadbRepositoryModule } from '../drizzle-mariadb-repository.module.js';

runRepositoryConformance(
  drizzleMysqlConformanceHarness(
    'drizzle-mariadb/mariadb',
    DrizzleMariadbRepositoryModule,
    process.env.MARIADB_URL ??
      'mysql://root:mariadb@localhost:53307/rockets_test',
  ),
  { describe, it, beforeAll, afterAll, beforeEach },
);
