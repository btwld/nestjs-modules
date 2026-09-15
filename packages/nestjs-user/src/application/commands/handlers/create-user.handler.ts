import { Inject, Optional } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  EventPublisher,
  ICommandHandler,
} from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { User } from '../../../domain/aggregates/user.js';
import { UserPasswordPort } from '../../../domain/ports/user-password.port.js';
import { UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../user.constants.js';
import { CreateUserCredentialCommand } from '../impl/create-user-credential.command.js';
import { CreateUserCommand } from '../impl/create-user.command.js';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface,
    private readonly commandBus: CommandBus,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
    // Only provided when a credentials entity/repository is configured
    // (see createUserCredentialProviders) — CreateUserHandler itself is
    // registered unconditionally, so this must stay optional.
    @Optional()
    private readonly passwordPort?: UserPasswordPort,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const { ctx, dto } = command;
    const userEventContext = createEventContext(ctx, {}, {});

    // Validate and hash the password before anything is written, so a weak
    // password fails here rather than leaving a persisted, credential-less
    // user behind for a rollback to clean up.
    const passwordStorage = dto.password
      ? await this.passwordPort?.create(dto.password)
      : undefined;

    return this.txScope.run(ctx, async (txCtx) => {
      const user = this.eventPublisher.mergeObjectContext(
        User.create(userEventContext, dto),
      );

      await this.userRepository.save(txCtx, user);

      // create initial credentials if password provided
      if (dto.password) {
        await this.commandBus.execute(
          new CreateUserCredentialCommand(
            txCtx,
            user.id,
            passwordStorage ?? dto.password,
          ),
        );
      }

      txCtx.trx.onCommit(() => user.commit());
      txCtx.trx.onRollback(() => user.uncommit());

      return user;
    });
  }
}
