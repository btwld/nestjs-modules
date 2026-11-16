import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Invitation } from '../../../domain/aggregates/invitation.js';
import { InvitationService } from '../../../domain/services/invitation.service.js';
import { CreateInvitationCommand } from '../impl/create-invitation.command.js';

@CommandHandler(CreateInvitationCommand)
export class CreateInvitationHandler implements ICommandHandler<CreateInvitationCommand> {
  constructor(private readonly invitationService: InvitationService) {}

  async execute(command: CreateInvitationCommand): Promise<Invitation> {
    const { ctx, dto } = command;
    return this.invitationService.create(ctx, dto);
  }
}
