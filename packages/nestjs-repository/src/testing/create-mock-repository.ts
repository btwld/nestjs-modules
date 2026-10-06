import { vi, type Mocked } from 'vitest';

import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryInterface } from '../repository/interfaces/repository.interface.js';

/**
 * Create a Vitest-mocked RepositoryInterface for unit testing.
 *
 * All methods are `vi.fn()` stubs. Override individual mocks
 * as needed in your test setup.
 *
 * @param metadataOverrides - Optional overrides for repository metadata
 */
export function createMockRepository<
  Entity extends PlainLiteralObject = PlainLiteralObject,
>(
  metadataOverrides: Partial<RepositoryInterface<Entity>['metadata']> = {},
): Mocked<RepositoryInterface<Entity>> {
  return {
    metadata: {
      name: 'MockEntity',
      type: class {} as never,
      columns: [],
      ...metadataOverrides,
    },
    find: vi.fn(),
    findOne: vi.fn(),
    count: vi.fn(),
    findAndCount: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    replace: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
    merge: vi.fn(),
    prepare: vi.fn(),
  };
}
