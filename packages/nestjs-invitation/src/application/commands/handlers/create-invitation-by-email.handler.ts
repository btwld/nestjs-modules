import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Invitation } from '../../../domain/aggregates/invitation.js';
import { InvitationService } from '../../../domain/services/invitation.service.js';
import { CreateInvitationByEmailCommand } from '../impl/create-invitation-by-email.command.js';

@CommandHandler(CreateInvitationByEmailCommand)
export class CreateInvitationByEmailHandler implements ICommandHandler<CreateInvitationByEmailCommand> {
  constructor(private readonly invitationService: InvitationService) {}

  async execute(command: CreateInvitationByEmailCommand): Promise<Invitation> {
    const { ctx, dto } = command;
    return this.invitationService.createByEmail(ctx, dto);
  }
}
