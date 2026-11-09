import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../user.constants.js';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception.js';
import { UpdateUserCredentialCommand } from '../impl/update-user-credential.command.js';
import { UpdateUserPasswordCommand } from '../impl/update-user-password.command.js';

@CommandHandler(UpdateUserPasswordCommand)
export class UpdateUserPasswordHandler implements ICommandHandler<
  UpdateUserPasswordCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface,
    private readonly commandBus: CommandBus,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: UpdateUserPasswordCommand): Promise<void> {
    const { ctx, userId, passwordDto } = command;
    return this.txScope.run(ctx, async (txCtx) => {
      // verify user exists
      const user = await this.userRepository.get(txCtx, userId);

      if (!user) {
        throw new UserNotFoundException({ id: userId });
      }

      await this.commandBus.execute(
        new UpdateUserCredentialCommand(txCtx, userId, passwordDto),
      );
    });
  }
}
