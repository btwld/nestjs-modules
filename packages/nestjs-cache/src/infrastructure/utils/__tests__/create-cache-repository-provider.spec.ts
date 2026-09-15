import { getDynamicRepositoryToken } from '@concepta/nestjs-repository';

import { CACHE_CUSTOM_REPOSITORY_TOKEN } from '../../../cache.constants.js';
import { CacheMapper } from '../../persistence/cache.mapper.js';
import { CacheRepository } from '../../persistence/cache.repository.js';
import {
  createCacheRepositoryProvider,
  getDynamicCacheRepositoryToken,
} from '../create-cache-repository-provider.js';

describe('getDynamicCacheRepositoryToken', () => {
  it('should return uppercase token with prefix', () => {
    expect(getDynamicCacheRepositoryToken('user')).toBe(
      'CACHE_REPOSITORY_USER',
    );
  });

  it('should handle mixed case', () => {
    expect(getDynamicCacheRepositoryToken('UserCache')).toBe(
      'CACHE_REPOSITORY_USERCACHE',
    );
  });
});

describe('createCacheRepositoryProvider', () => {
  it('should create a provider with correct token', () => {
    const provider = createCacheRepositoryProvider('user');

    expect(provider).toEqual(
      expect.objectContaining({
        provide: 'CACHE_REPOSITORY_USER',
      }),
    );
  });

  it('should inject repository token, mapper, and custom repo token', () => {
    const provider = createCacheRepositoryProvider('user') as {
      inject: unknown[];
    };

    expect(provider.inject).toEqual([
      getDynamicRepositoryToken('user'),
      CacheMapper,
      { token: CACHE_CUSTOM_REPOSITORY_TOKEN, optional: true },
    ]);
  });

  it('should have a useFactory that returns CacheRepository', () => {
    const provider = createCacheRepositoryProvider('user') as {
      useFactory: (...args: unknown[]) => unknown;
    };

    const mockRepo = {} as never;
    const mockMapper = new CacheMapper();
    const result = provider.useFactory(mockRepo, mockMapper);

    expect(result).toBeInstanceOf(CacheRepository);
  });
});
