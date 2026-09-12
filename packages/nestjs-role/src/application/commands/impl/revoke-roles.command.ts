import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

export class RevokeRolesCommand extends Command<void> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly roleIds: string[],
    public readonly assigneeId: string,
  ) {
    super();
  }
}
