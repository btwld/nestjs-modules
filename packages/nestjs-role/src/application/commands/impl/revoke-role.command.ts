import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

export class RevokeRoleCommand extends Command<void> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly roleId: string,
    public readonly assigneeId: string,
  ) {
    super();
  }
}
