import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { drizzlePostgresConformanceHarness } from '../__fixtures__/conformance-postgres-harness.fixture.js';
import { pgliteDatabase } from '../__fixtures__/postgres-databases.fixture.js';

runRepositoryConformance(
  drizzlePostgresConformanceHarness('drizzle-postgres/pglite', pgliteDatabase),
  { describe, it, beforeAll, afterAll, beforeEach },
);
