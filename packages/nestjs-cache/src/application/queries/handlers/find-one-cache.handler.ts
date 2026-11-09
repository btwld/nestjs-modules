import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../../../cache.constants.js';
import { Cache } from '../../../domain/aggregates/cache.js';
import { CacheRepositoryResolverInterface } from '../../../domain/repositories/cache-repository-resolver.interface.js';
import { FindOneCacheQuery } from '../impl/find-one-cache.query.js';

@QueryHandler(FindOneCacheQuery)
export class FindOneCacheHandler implements IQueryHandler<FindOneCacheQuery> {
  constructor(
    @Inject(CACHE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: CacheRepositoryResolverInterface,
  ) {}

  async execute(query: FindOneCacheQuery): Promise<Cache | null> {
    const { ctx, namespace, key, type, assigneeId } = query;

    const cacheRepo = this.repositoryResolver.resolve(namespace);

    return cacheRepo.findOne(ctx, { key, type, assigneeId });
  }
}
