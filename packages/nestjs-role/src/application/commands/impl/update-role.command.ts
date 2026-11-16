import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import {
  type Role,
  type RoleCreateProps,
} from '../../../domain/aggregates/role.js';

export class UpdateRoleCommand extends Command<Role> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly id: ReferenceId,
    public readonly dto: Partial<RoleCreateProps>,
  ) {
    super();
  }
}
