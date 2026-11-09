import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type RoleAssignment } from '../../../domain/aggregates/role-assignment.js';

export class AssignRolesCommand extends Command<RoleAssignment[]> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly roleIds: string[],
    public readonly assigneeId: string,
  ) {
    super();
  }
}
