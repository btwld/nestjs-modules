import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../../../cache.constants.js';
import { Cache } from '../../../domain/aggregates/cache.js';
import { CacheRepositoryResolverInterface } from '../../../domain/repositories/cache-repository-resolver.interface.js';
import { CacheNotFoundException } from '../../exceptions/cache-not-found.exception.js';
import { ArchiveCacheCommand } from '../impl/archive-cache.command.js';

@CommandHandler(ArchiveCacheCommand)
export class ArchiveCacheHandler implements ICommandHandler<ArchiveCacheCommand> {
  constructor(
    @Inject(CACHE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: CacheRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: ArchiveCacheCommand): Promise<Cache> {
    const { ctx, namespace, id } = command;
    const cacheRepo = this.repositoryResolver.resolve(namespace);

    return this.txScope.run(ctx, async (txCtx) => {
      const cache = await cacheRepo.get(txCtx, id);

      if (!cache) {
        throw new CacheNotFoundException(id);
      }

      await cacheRepo.softRemove(txCtx, cache);
      return cache;
    });
  }
}
