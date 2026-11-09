import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CreateInvitationByEmailCommand } from '../../../../application/commands/impl/create-invitation-by-email.command.js';
import { Invitation } from '../../../../domain/aggregates/invitation.js';
import { CreateInvitationByEmailRequest } from '../impl/create-invitation-by-email.request.js';

@Injectable()
export class CreateInvitationByEmailRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: CreateInvitationByEmailRequest) {
    const { context, dto } = command;

    const invitation = await this.commandBus.execute<
      CreateInvitationByEmailCommand,
      Invitation
    >(new CreateInvitationByEmailCommand(context, dto));

    return invitation.toPlain();
  }
}
