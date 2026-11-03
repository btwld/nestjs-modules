import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { drizzleSqliteConformanceHarness } from '../__fixtures__/conformance-sqlite-harness.fixture.js';

runRepositoryConformance(drizzleSqliteConformanceHarness(), {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
});
