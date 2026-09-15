import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type RoleAssignment } from '../../../domain/aggregates/role-assignment.js';

export class GetAssignedRolesQuery extends Query<RoleAssignment[]> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly assigneeId: string,
  ) {
    super();
  }
}
