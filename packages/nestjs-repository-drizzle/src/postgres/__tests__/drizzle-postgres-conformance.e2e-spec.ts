import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { drizzlePostgresConformanceHarness } from '../__fixtures__/conformance-postgres-harness.fixture.js';

runRepositoryConformance(drizzlePostgresConformanceHarness(), {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
});
