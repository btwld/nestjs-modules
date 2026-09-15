import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { Identity } from '../../../domain/aggregates/identity.js';
import { IdentityRepositoryInterface } from '../../../domain/repositories/identity-repository.interface.js';
import { FEDERATED_MODULE_IDENTITY_REPOSITORY_TOKEN } from '../../../federated.constants.js';
import { CreateIdentityCommand } from '../impl/create-identity.command.js';

@CommandHandler(CreateIdentityCommand)
export class CreateIdentityHandler implements ICommandHandler<CreateIdentityCommand> {
  constructor(
    @Inject(FEDERATED_MODULE_IDENTITY_REPOSITORY_TOKEN)
    private readonly identityRepo: IdentityRepositoryInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateIdentityCommand): Promise<Identity> {
    const { ctx, dto } = command;

    return this.txScope.run(ctx, async (txCtx) => {
      const eventContext = createEventContext(txCtx, {}, {});

      const identity = this.eventPublisher.mergeObjectContext(
        Identity.create(eventContext, dto),
      );

      await this.identityRepo.save(txCtx, identity);

      txCtx.trx.onCommit(() => identity.commit());
      txCtx.trx.onRollback(() => identity.uncommit());

      return identity;
    });
  }
}
