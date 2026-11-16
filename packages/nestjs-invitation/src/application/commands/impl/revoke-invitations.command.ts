import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

export class RevokeInvitationsCommand extends Command<void> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
    public readonly category: string,
  ) {
    super();
  }
}
