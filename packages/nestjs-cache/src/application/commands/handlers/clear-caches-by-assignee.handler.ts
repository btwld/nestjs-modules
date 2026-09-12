import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { CACHE_REPOSITORY_RESOLVER_TOKEN } from '../../../cache.constants.js';
import { CacheRepositoryResolverInterface } from '../../../domain/repositories/cache-repository-resolver.interface.js';
import { ClearCachesByAssigneeCommand } from '../impl/clear-caches-by-assignee.command.js';

@CommandHandler(ClearCachesByAssigneeCommand)
export class ClearCachesByAssigneeHandler implements ICommandHandler<ClearCachesByAssigneeCommand> {
  constructor(
    @Inject(CACHE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: CacheRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: ClearCachesByAssigneeCommand): Promise<void> {
    const { ctx, namespace, assigneeId } = command;
    const cacheRepo = this.repositoryResolver.resolve(namespace);

    return this.txScope.run(ctx, async (txCtx) => {
      await cacheRepo.removeAllByAssignee(txCtx, assigneeId);
    });
  }
}
