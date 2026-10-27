import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../../../cache.constants.js';
import { Cache } from '../../../domain/aggregates/cache.js';
import { CacheRepositoryResolverInterface } from '../../../domain/repositories/cache-repository-resolver.interface.js';
import { CacheNotFoundException } from '../../exceptions/cache-not-found.exception.js';
import { SoftDeleteCacheCommand } from '../impl/soft-delete-cache.command.js';

@CommandHandler(SoftDeleteCacheCommand)
export class SoftDeleteCacheHandler implements ICommandHandler<SoftDeleteCacheCommand> {
  constructor(
    @Inject(CACHE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: CacheRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: SoftDeleteCacheCommand): Promise<Cache> {
    const { ctx, namespace, id } = command;
    const cacheRepo = this.repositoryResolver.resolve(namespace);

    return this.txScope.run(ctx, async (txCtx) => {
      const cache = await cacheRepo.get(txCtx, id);

      if (!cache) {
        throw new CacheNotFoundException(id);
      }

      await cacheRepo.softDelete(txCtx, cache);
      return cache;
    });
  }
}
