import { HttpException, HttpStatus } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { AcceptInvitationCommand } from '../../../../application/commands/impl/accept-invitation.command.js';
import { assertInvitationCode } from '../../../../application/utils/assert-invitation-code.util.js';
import { Invitation } from '../../../../domain/aggregates/invitation.js';
import { InvitationNotAcceptedException } from '../../../exceptions/invitation-not-accepted.exception.js';
import { AcceptInvitationRequest } from '../impl/accept-invitation.request.js';

@CommandHandler(AcceptInvitationRequest)
export class AcceptInvitationRequestHandler implements ICommandHandler<AcceptInvitationRequest> {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: AcceptInvitationRequest): Promise<null> {
    const { context, dto } = command;
    const { code } = context.params;

    assertInvitationCode(code);

    let invitation: Invitation | null = null;

    try {
      invitation = await this.commandBus.execute(
        new AcceptInvitationCommand(context, code, dto),
      );
    } catch (e: unknown) {
      if (e instanceof HttpException) {
        throw e;
      }

      throw new InvitationNotAcceptedException({
        originalError: e,
      });
    }

    if (!invitation) {
      // otpPort.consume() found no match: a wrong or expired passcode.
      throw new InvitationNotAcceptedException({
        safeMessage: 'Invitation could not be accepted',
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }

    return null;
  }
}
