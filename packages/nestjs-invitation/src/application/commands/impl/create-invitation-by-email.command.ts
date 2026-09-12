import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type Invitation } from '../../../domain/aggregates/invitation.js';
import { type InvitationCreatableByEmailInterface } from '../../../domain/interfaces/invitation-creatable-by-email.interface.js';

export class CreateInvitationByEmailCommand extends Command<Invitation> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly dto: InvitationCreatableByEmailInterface,
  ) {
    super();
  }
}
