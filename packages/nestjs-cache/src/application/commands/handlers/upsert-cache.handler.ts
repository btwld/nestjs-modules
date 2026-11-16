import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../../../cache.constants.js';
import { Cache } from '../../../domain/aggregates/cache.js';
import { CacheExpirationPolicy } from '../../../domain/policies/cache-expiration.policy.js';
import { CacheRepositoryResolverInterface } from '../../../domain/repositories/cache-repository-resolver.interface.js';
import { UpsertCacheCommand } from '../impl/upsert-cache.command.js';

@CommandHandler(UpsertCacheCommand)
export class UpsertCacheHandler implements ICommandHandler<UpsertCacheCommand> {
  constructor(
    @Inject(CACHE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: CacheRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly expirationPolicy: CacheExpirationPolicy,
  ) {}

  async execute(command: UpsertCacheCommand): Promise<Cache> {
    const { ctx, namespace, dto } = command;
    const { key, type, data, assigneeId, expiresIn } = dto;
    const cacheRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      let cache: Cache;

      const existing = await cacheRepo.findOne(txCtx, {
        key,
        type,
        assigneeId,
      });

      if (existing) {
        cache = this.eventPublisher.mergeObjectContext(existing);

        // omitted `data` means "leave unchanged" (partial update) —
        // matching the existing conditional pattern for `expiresIn` below.
        if (data !== undefined) {
          cache.updateData(eventContext, data);
        }

        if (expiresIn) {
          const expirationDate =
            this.expirationPolicy.resolveExpirationDate(expiresIn);
          cache.extend(eventContext, expirationDate);
        }
      } else {
        const expirationDate =
          this.expirationPolicy.resolveExpirationDate(expiresIn);
        cache = this.eventPublisher.mergeObjectContext(
          Cache.create(eventContext, dto, expirationDate),
        );
      }

      await cacheRepo.save(txCtx, cache);

      txCtx.trx.onCommit(() => cache.commit());
      txCtx.trx.onRollback(() => cache.uncommit());

      return cache;
    });
  }
}
