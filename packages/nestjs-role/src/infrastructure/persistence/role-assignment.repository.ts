import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';
import { type RepositoryInterface, Where } from '@concepta/nestjs-repository';

import { type RoleAssignment } from '../../domain/aggregates/role-assignment.js';
import { type RoleAssignmentEntityInterface } from '../../domain/interfaces/role-assignment-entity.interface.js';
import { type RoleAssignmentRepositoryInterface } from '../../domain/repositories/role-assignment-repository.interface.js';

import { type RoleAssignmentMapper } from './role-assignment.mapper.js';

export class RoleAssignmentRepository implements RoleAssignmentRepositoryInterface {
  constructor(
    protected readonly repository: RepositoryInterface<RoleAssignmentEntityInterface>,
    private readonly mapper: RoleAssignmentMapper,
  ) {}

  async get(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<RoleAssignment | null> {
    const w = Where.for<RoleAssignmentEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('id', id),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByAssignee(
    ctx: PlainLiteralObject,
    assigneeId: string,
  ): Promise<RoleAssignment[]> {
    const w = Where.for<RoleAssignmentEntityInterface>();

    const entities = await this.repository.find({
      where: w.eq('assigneeId', assigneeId),
      ctx,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findOne(
    ctx: PlainLiteralObject,
    roleId: string,
    assigneeId: string,
  ): Promise<RoleAssignment | null> {
    const w = Where.for<RoleAssignmentEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.and(w.eq('roleId', roleId), w.eq('assigneeId', assigneeId)),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByRoleIdsAndAssignee(
    ctx: PlainLiteralObject,
    roleIds: string[],
    assigneeId: string,
  ): Promise<RoleAssignment[]> {
    const w = Where.for<RoleAssignmentEntityInterface>();

    const entities = await this.repository.find({
      where: w.and(w.in('roleId', roleIds), w.eq('assigneeId', assigneeId)),
      ctx,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async countByRoleIdAndAssignee(
    ctx: PlainLiteralObject,
    roleId: string,
    assigneeId: string,
  ): Promise<number> {
    const w = Where.for<RoleAssignmentEntityInterface>();

    return this.repository.count({
      where: w.and(w.eq('roleId', roleId), w.eq('assigneeId', assigneeId)),
      ctx,
    });
  }

  async countByRoleIdsAndAssignee(
    ctx: PlainLiteralObject,
    roleIds: string[],
    assigneeId: string,
  ): Promise<number> {
    const w = Where.for<RoleAssignmentEntityInterface>();

    return this.repository.count({
      where: w.and(w.in('roleId', roleIds), w.eq('assigneeId', assigneeId)),
      ctx,
    });
  }

  async save(
    ctx: PlainLiteralObject,
    roleAssignment: RoleAssignment,
  ): Promise<void> {
    roleAssignment.stampUpdated();
    await this.repository.upsert(this.mapper.toPersistence(roleAssignment), {
      ctx,
    });
  }

  /**
   * Save multiple assignments sequentially within the current transaction.
   * Sequential execution ensures consistent ordering and avoids
   * potential issues with parallel writes in the same transaction.
   */
  async saveMany(
    ctx: PlainLiteralObject,
    roleAssignments: RoleAssignment[],
  ): Promise<void> {
    for (const ra of roleAssignments) {
      await this.save(ctx, ra);
    }
  }

  async remove(
    ctx: PlainLiteralObject,
    roleAssignment: RoleAssignment,
  ): Promise<void> {
    await this.repository.delete(this.mapper.toPersistence(roleAssignment), {
      ctx,
    });
  }

  async removeMany(
    ctx: PlainLiteralObject,
    roleAssignments: RoleAssignment[],
  ): Promise<void> {
    await this.repository.deleteMany(
      roleAssignments.map((ra) => this.mapper.toPersistence(ra)),
      { ctx },
    );
  }
}
