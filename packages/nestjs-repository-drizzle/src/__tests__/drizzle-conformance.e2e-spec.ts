import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { drizzleConformanceHarness } from '../__fixtures__/conformance/conformance-harness.fixture.js';

runRepositoryConformance(drizzleConformanceHarness(), {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
});
