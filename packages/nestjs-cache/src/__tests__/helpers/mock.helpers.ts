import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { ActionEnum, AppContextHost, Operation } from '@concepta/nestjs-core';
import {
  createMockCommandBus,
  createMockEventPublisher,
  createTestEventContext,
} from '@concepta/nestjs-core/testing';
import { type CrudContextInterface, CrudCtx } from '@concepta/nestjs-crud';
import { createMockTransaction } from '@concepta/nestjs-repository/testing';

import { type Cache } from '../../domain/aggregates/cache.js';
import { CacheCtx } from '../../gateways/cache-context.overlay.js';
import { type CacheRepositoryResolver } from '../../infrastructure/persistence/cache-repository.resolver.js';
import { CacheMapper } from '../../infrastructure/persistence/cache.mapper.js';
import { type CacheRepository } from '../../infrastructure/persistence/cache.repository.js';
import { type CacheEntityInterface } from '../../infrastructure/persistence/interfaces/cache-entity.interface.js';

export const DEFAULT_CACHE_NAMESPACE = 'UserCache';

export {
  createMockCommandBus,
  createMockEventPublisher,
  createMockTransaction,
};
export type { MockTransactionHandle } from '@concepta/nestjs-repository/testing';

export function createMockCacheRepository(): DeepMockProxy<CacheRepository> {
  return mockDeep<CacheRepository>();
}

export function createMockRepositoryResolver(
  repo: CacheRepository,
): DeepMockProxy<CacheRepositoryResolver> {
  const resolver = mockDeep<CacheRepositoryResolver>();
  resolver.resolve.mockReturnValue(repo);
  return resolver;
}

export function createMockEventContext(namespace = DEFAULT_CACHE_NAMESPACE) {
  return createTestEventContext({ namespace }, {});
}

export function createMockCacheEntity(
  overrides: Partial<CacheEntityInterface> = {},
): CacheEntityInterface {
  return {
    id: 'test-id',
    key: 'test-key',
    type: 'test-type',
    assigneeId: 'test-assignee',
    data: 'test-data',
    expirationDate: new Date('2027-01-01'),
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

export function createMockCacheContext(
  crudOverrides: Partial<CrudContextInterface> = {},
  namespace = DEFAULT_CACHE_NAMESPACE,
) {
  const ctx = new AppContextHost();

  ctx.defineOverlay(CrudCtx, {
    entity: crudOverrides.entity ?? 'UserCache',
    params: crudOverrides.params ?? {},
    query: crudOverrides.query ?? {},
    options: crudOverrides.options ?? {},
    operation: crudOverrides.operation ?? Operation.Read,
    action: crudOverrides.action ?? ActionEnum.READ,
  });

  ctx.defineOverlay(CacheCtx, { namespace });

  // Return the resolved CRUD child — has CRUD props (own)
  // and withCache() inherited via prototype chain.
  return ctx.require(CrudCtx, CacheCtx).withCrud();
}

const cacheMapper = new CacheMapper();

export function toCacheDomain(entity: CacheEntityInterface): Cache {
  return cacheMapper.toDomain(entity);
}
