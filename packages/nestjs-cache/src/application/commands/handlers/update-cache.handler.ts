import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../../../cache.constants.js';
import { Cache } from '../../../domain/aggregates/cache.js';
import { CacheExpirationPolicy } from '../../../domain/policies/cache-expiration.policy.js';
import { CacheRepositoryResolverInterface } from '../../../domain/repositories/cache-repository-resolver.interface.js';
import { CacheNotFoundException } from '../../exceptions/cache-not-found.exception.js';
import { UpdateCacheCommand } from '../impl/update-cache.command.js';

@CommandHandler(UpdateCacheCommand)
export class UpdateCacheHandler implements ICommandHandler<UpdateCacheCommand> {
  constructor(
    @Inject(CACHE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: CacheRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly expirationPolicy: CacheExpirationPolicy,
  ) {}

  async execute(command: UpdateCacheCommand): Promise<Cache> {
    const { ctx, namespace, id, dto } = command;
    const { data, expiresIn } = dto;
    const cacheRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const existing = await cacheRepo.get(txCtx, id);

      if (!existing) {
        throw new CacheNotFoundException(id);
      }

      const cache = this.eventPublisher.mergeObjectContext(existing);

      // omitted `data` means "leave unchanged" (partial update) — matching
      // the existing conditional pattern for `expiresIn` below.
      if (data !== undefined) {
        cache.updateData(eventContext, data);
      }

      if (expiresIn) {
        const expirationDate =
          this.expirationPolicy.resolveExpirationDate(expiresIn);
        cache.extend(eventContext, expirationDate);
      }

      await cacheRepo.save(txCtx, cache);

      txCtx.trx.onCommit(() => cache.commit());
      txCtx.trx.onRollback(() => cache.uncommit());

      return cache;
    });
  }
}
