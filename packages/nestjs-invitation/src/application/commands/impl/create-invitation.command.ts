import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type Invitation } from '../../../domain/aggregates/invitation.js';
import { type InvitationCreatableInterface } from '../../../domain/interfaces/invitation-creatable.interface.js';

export class CreateInvitationCommand extends Command<Invitation> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly dto: InvitationCreatableInterface,
  ) {
    super();
  }
}
