import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type RoleAssignment } from '../aggregates/role-assignment.js';

export interface RoleAssignmentRepositoryInterface {
  get(ctx: PlainLiteralObject, id: ReferenceId): Promise<RoleAssignment | null>;

  findByAssignee(
    ctx: PlainLiteralObject,
    assigneeId: string,
  ): Promise<RoleAssignment[]>;

  findOne(
    ctx: PlainLiteralObject,
    roleId: string,
    assigneeId: string,
  ): Promise<RoleAssignment | null>;

  findByRoleIdsAndAssignee(
    ctx: PlainLiteralObject,
    roleIds: string[],
    assigneeId: string,
  ): Promise<RoleAssignment[]>;

  countByRoleIdAndAssignee(
    ctx: PlainLiteralObject,
    roleId: string,
    assigneeId: string,
  ): Promise<number>;

  countByRoleIdsAndAssignee(
    ctx: PlainLiteralObject,
    roleIds: string[],
    assigneeId: string,
  ): Promise<number>;

  save(ctx: PlainLiteralObject, roleAssignment: RoleAssignment): Promise<void>;

  saveMany(
    ctx: PlainLiteralObject,
    roleAssignments: RoleAssignment[],
  ): Promise<void>;

  remove(
    ctx: PlainLiteralObject,
    roleAssignment: RoleAssignment,
  ): Promise<void>;

  removeMany(
    ctx: PlainLiteralObject,
    roleAssignments: RoleAssignment[],
  ): Promise<void>;
}
