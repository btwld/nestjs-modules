import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../../../cache.constants.js';
import { Cache } from '../../../domain/aggregates/cache.js';
import { CacheExpirationPolicy } from '../../../domain/policies/cache-expiration.policy.js';
import { CacheRepositoryResolverInterface } from '../../../domain/repositories/cache-repository-resolver.interface.js';
import { ReplaceCacheCommand } from '../impl/replace-cache.command.js';

@CommandHandler(ReplaceCacheCommand)
export class ReplaceCacheHandler implements ICommandHandler<ReplaceCacheCommand> {
  constructor(
    @Inject(CACHE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: CacheRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly expirationPolicy: CacheExpirationPolicy,
  ) {}

  async execute(command: ReplaceCacheCommand): Promise<Cache> {
    const { ctx, namespace, id, dto } = command;
    const cacheRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const expirationDate = this.expirationPolicy.resolveExpirationDate(
        dto.expiresIn,
      );

      let cache: Cache;

      const existing = await cacheRepo.get(txCtx, id);

      if (existing) {
        cache = this.eventPublisher.mergeObjectContext(existing);
        cache.replace(eventContext, dto, expirationDate);
      } else {
        cache = this.eventPublisher.mergeObjectContext(
          Cache.createWithId(eventContext, id, dto, expirationDate),
        );
      }

      await cacheRepo.save(txCtx, cache);

      txCtx.trx.onCommit(() => cache.commit());
      txCtx.trx.onRollback(() => cache.uncommit());

      return cache;
    });
  }
}
