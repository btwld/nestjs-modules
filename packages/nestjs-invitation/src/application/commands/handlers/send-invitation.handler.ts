import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { InvitationService } from '../../../domain/services/invitation.service.js';
import { SendInvitationCommand } from '../impl/send-invitation.command.js';

@CommandHandler(SendInvitationCommand)
export class SendInvitationHandler implements ICommandHandler<SendInvitationCommand> {
  constructor(private readonly invitationService: InvitationService) {}

  async execute(command: SendInvitationCommand): Promise<void> {
    const { ctx, id } = command;
    return this.invitationService.sendById(ctx, id);
  }
}
