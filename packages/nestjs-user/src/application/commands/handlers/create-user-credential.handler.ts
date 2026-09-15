import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { UserCredentials } from '../../../domain/aggregates/user-credentials.js';
import { UserCredentialsService } from '../../../domain/services/user-credentials.service.js';
import { CreateUserCredentialCommand } from '../impl/create-user-credential.command.js';

@CommandHandler(CreateUserCredentialCommand)
export class CreateUserCredentialHandler implements ICommandHandler<
  CreateUserCredentialCommand,
  UserCredentials
> {
  constructor(
    private readonly userCredentialsService: UserCredentialsService,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(
    command: CreateUserCredentialCommand,
  ): Promise<UserCredentials> {
    const { ctx, userId, password } = command;
    return this.txScope.run(ctx, async (txCtx) => {
      const eventContext = createEventContext(txCtx, {}, {});

      return this.userCredentialsService.setPassword(
        txCtx,
        eventContext,
        userId,
        password,
      );
    });
  }
}
