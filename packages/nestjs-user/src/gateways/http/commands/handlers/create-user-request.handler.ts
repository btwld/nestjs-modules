import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CreateUserCommand } from '../../../../application/commands/impl/create-user.command.js';
import { User } from '../../../../domain/aggregates/user.js';
import { CreateUserRequest } from '../impl/create-user.request.js';

@Injectable()
export class CreateUserRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: CreateUserRequest) {
    const { context, dto } = command;
    const user = await this.commandBus.execute<CreateUserCommand, User>(
      new CreateUserCommand(context, dto),
    );
    return user.toPlain();
  }
}
