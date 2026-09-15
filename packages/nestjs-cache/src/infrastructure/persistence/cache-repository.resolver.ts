import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { CacheRepositoryResolverInterface } from '../../domain/repositories/cache-repository-resolver.interface.js';
import { CacheRepositoryInterface } from '../../domain/repositories/cache-repository.interface.js';
import { CacheEntityNotFoundException } from '../exceptions/cache-entity-not-found.exception.js';
import { getDynamicCacheRepositoryToken } from '../utils/create-cache-repository-provider.js';

@Injectable()
export class CacheRepositoryResolver implements CacheRepositoryResolverInterface {
  constructor(private readonly moduleRef: ModuleRef) {}

  resolve(entityKey: string): CacheRepositoryInterface {
    const token = getDynamicCacheRepositoryToken(entityKey);

    try {
      return this.moduleRef.get<CacheRepositoryInterface>(token, {
        strict: false,
      });
    } catch (error) {
      throw new CacheEntityNotFoundException(entityKey, {
        originalError: error,
      });
    }
  }
}
