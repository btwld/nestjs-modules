import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

export class IsAssignedRolesQuery extends Query<boolean> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly roleIds: string[],
    public readonly assigneeId: string,
  ) {
    super();
  }
}
