import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type CommandBus } from '@nestjs/cqrs';

/**
 * Create a mock CommandBus for unit testing.
 */
export function createMockCommandBus(): DeepMockProxy<CommandBus> {
  return mockDeep<CommandBus>();
}
