import { type Provider, type Type } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { CACHE_CUSTOM_REPOSITORY_TOKEN } from '../../cache.constants.js';
import { type CacheRepositoryInterface } from '../../domain/repositories/cache-repository.interface.js';
import { CacheMapper } from '../persistence/cache.mapper.js';
import { CacheRepository } from '../persistence/cache.repository.js';
import { type CacheEntityInterface } from '../persistence/interfaces/cache-entity.interface.js';

export function getDynamicCacheRepositoryToken(entityKey: string): string {
  return `CACHE_REPOSITORY_${entityKey.toUpperCase()}`;
}

export function createCacheRepositoryProvider(entityKey: string): Provider {
  return {
    provide: getDynamicCacheRepositoryToken(entityKey),
    inject: [
      getDynamicRepositoryToken(entityKey),
      CacheMapper,
      { token: CACHE_CUSTOM_REPOSITORY_TOKEN, optional: true },
    ],
    useFactory: (
      repository: RepositoryInterface<CacheEntityInterface>,
      mapper: CacheMapper,
      customRepo?: Type<CacheRepositoryInterface>,
    ) => {
      const RepoClass = customRepo ?? CacheRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
