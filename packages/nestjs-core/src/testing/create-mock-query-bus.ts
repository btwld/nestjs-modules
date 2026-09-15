import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type QueryBus } from '@nestjs/cqrs';

/**
 * Create a mock QueryBus for unit testing.
 */
export function createMockQueryBus(): DeepMockProxy<QueryBus> {
  return mockDeep<QueryBus>();
}
