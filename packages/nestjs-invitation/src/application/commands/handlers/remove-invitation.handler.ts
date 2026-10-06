import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Invitation } from '../../../domain/aggregates/invitation.js';
import { InvitationService } from '../../../domain/services/invitation.service.js';
import { RemoveInvitationCommand } from '../impl/remove-invitation.command.js';

@CommandHandler(RemoveInvitationCommand)
export class RemoveInvitationHandler implements ICommandHandler<RemoveInvitationCommand> {
  constructor(private readonly invitationService: InvitationService) {}

  async execute(command: RemoveInvitationCommand): Promise<Invitation> {
    const { ctx, id } = command;
    return this.invitationService.remove(ctx, id);
  }
}
