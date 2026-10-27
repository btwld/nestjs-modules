import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CreateInvitationCommand } from '../../../../application/commands/impl/create-invitation.command.js';
import { CreateInvitationRequest } from '../impl/create-invitation.request.js';

@Injectable()
export class CreateInvitationRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: CreateInvitationRequest) {
    const { context, dto } = command;

    const invitation = await this.commandBus.execute(
      new CreateInvitationCommand(context, dto),
    );

    return invitation.toPlain();
  }
}
