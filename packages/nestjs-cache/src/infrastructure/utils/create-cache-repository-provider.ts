import { type Provider } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { CACHE_CUSTOM_REPOSITORY_TOKEN } from '../../cache.constants.js';
import { type CacheRepositoryConstructor } from '../config/interfaces/cache-extras.interface.js';
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
      CACHE_CUSTOM_REPOSITORY_TOKEN,
    ],
    useFactory: (
      repository: RepositoryInterface<CacheEntityInterface>,
      mapper: CacheMapper,
      customRepo: CacheRepositoryConstructor | null,
    ) => {
      const RepoClass = customRepo ?? CacheRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
