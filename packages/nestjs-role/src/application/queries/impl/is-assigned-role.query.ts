import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

export class IsAssignedRoleQuery extends Query<boolean> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly roleId: string,
    public readonly assigneeId: string,
  ) {
    super();
  }
}
