import { Column, Unique } from 'typeorm';

import { ReferenceId } from '@concepta/nestjs-core';
import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm';

import { RoleAssignmentEntityInterface } from '../../../domain/interfaces/role-assignment-entity.interface.js';

/**
 * Role Assignment Postgres Entity
 */
@Unique(['roleId', 'assigneeId'])
export abstract class RoleAssignmentPostgresEntity
  extends CommonPostgresEntity
  implements RoleAssignmentEntityInterface
{
  /**
   * Role ID
   */
  @Column({ type: 'uuid' })
  roleId!: ReferenceId;

  /**
   * Assignee ID
   */
  @Column({ type: 'uuid' })
  assigneeId!: ReferenceId;
}
