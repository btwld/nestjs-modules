import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import {
  type Role,
  type RoleCreateProps,
} from '../../../domain/aggregates/role.js';

export class CreateRoleCommand extends Command<Role> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly dto: RoleCreateProps,
  ) {
    super();
  }
}
