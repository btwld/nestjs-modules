import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type Invitation } from '../../../domain/aggregates/invitation.js';
import { type InvitationAcceptableInterface } from '../../../domain/interfaces/invitation-acceptable.interface.js';

export class AcceptInvitationCommand extends Command<Invitation | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly code: string,
    public readonly dto: InvitationAcceptableInterface,
  ) {
    super();
  }
}
