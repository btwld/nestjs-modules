import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type Role } from '../../../domain/aggregates/role.js';

export class GetRoleQuery extends Query<Role> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly id: ReferenceId,
  ) {
    super();
  }
}
