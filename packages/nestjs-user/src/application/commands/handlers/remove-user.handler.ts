import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { User } from '../../../domain/aggregates/user.js';
import { UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../user.constants.js';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception.js';
import { RemoveUserCommand } from '../impl/remove-user.command.js';

@CommandHandler(RemoveUserCommand)
export class RemoveUserHandler implements ICommandHandler<
  RemoveUserCommand,
  User
> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: RemoveUserCommand): Promise<User> {
    const { ctx, id } = command;
    const eventContext = createEventContext(ctx, {}, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const existing = await this.userRepository.get(txCtx, id);

      if (!existing) {
        throw new UserNotFoundException({ id });
      }

      const user = this.eventPublisher.mergeObjectContext(existing);

      user.remove(eventContext);

      await this.userRepository.remove(txCtx, user);

      txCtx.trx.onCommit(() => user.commit());
      txCtx.trx.onRollback(() => user.uncommit());

      return user;
    });
  }
}
