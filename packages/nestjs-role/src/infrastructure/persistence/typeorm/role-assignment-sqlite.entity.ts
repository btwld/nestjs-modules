import { Column, Unique } from 'typeorm';

import { ReferenceId } from '@concepta/nestjs-core';
import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { RoleAssignmentEntityInterface } from '../../../domain/interfaces/role-assignment-entity.interface.js';

/**
 * Role Assignment Sqlite Entity
 */
@Unique(['roleId', 'assigneeId'])
export abstract class RoleAssignmentSqliteEntity
  extends CommonSqliteEntity
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
