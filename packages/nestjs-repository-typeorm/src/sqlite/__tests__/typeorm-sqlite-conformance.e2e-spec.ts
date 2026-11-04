import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { typeOrmConformanceHarness } from '../../__fixtures__/conformance/conformance-harness.fixture.js';
import { TypeOrmSqliteRepositoryModule } from '../typeorm-sqlite-repository.module.js';

runRepositoryConformance(
  typeOrmConformanceHarness(
    'typeorm/sqlite',
    TypeOrmSqliteRepositoryModule,
    { type: 'better-sqlite3', database: ':memory:' },
    // One connection: transactions run one at a time.
    'refused',
  ),
  { describe, it, beforeAll, afterAll, beforeEach },
);
