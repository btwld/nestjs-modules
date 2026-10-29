import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { typeOrmConformanceHarness } from '../__fixtures__/conformance/conformance-harness.fixture.js';

runRepositoryConformance(
  typeOrmConformanceHarness('typeorm/sqlite', {
    type: 'better-sqlite3',
    database: ':memory:',
  }),
  { describe, it, beforeAll, afterAll, beforeEach },
);
