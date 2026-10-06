import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type ModuleRef } from '@nestjs/core';

import { CacheEntityNotFoundException } from '../../exceptions/cache-entity-not-found.exception.js';
import { CacheRepositoryResolver } from '../cache-repository.resolver.js';
import { type CacheRepository } from '../cache.repository.js';

describe(CacheRepositoryResolver.name, () => {
  let resolver: CacheRepositoryResolver;
  let mockModuleRef: DeepMockProxy<ModuleRef>;

  beforeEach(() => {
    mockModuleRef = mockDeep<ModuleRef>();

    resolver = new CacheRepositoryResolver(mockModuleRef);
  });

  it('should return a CacheRepository when found', () => {
    const mockRepo = {} as CacheRepository;
    mockModuleRef.get.mockReturnValue(mockRepo);

    const result = resolver.resolve('UserCache');

    expect(result).toBe(mockRepo);
  });

  it('should throw CacheEntityNotFoundException when not found', () => {
    mockModuleRef.get.mockImplementation(() => {
      throw new Error('not found');
    });

    expect(() => resolver.resolve('Missing')).toThrow(
      CacheEntityNotFoundException,
    );
  });
});
