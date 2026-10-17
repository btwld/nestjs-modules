import { type DynamicModule, type Provider } from '@nestjs/common';

import { type RoleAssignmentRepositoryInterface } from '../../../domain/repositories/role-assignment-repository.interface.js';
import { type RoleRepositoryInterface } from '../../../domain/repositories/role-repository.interface.js';
import { type RoleAssignmentRepository } from '../../persistence/role-assignment.repository.js';
import { type RoleRepository } from '../../persistence/role.repository.js';

/**
 * A repository class built once per `forFeature` role key, around that key's
 * repository. Extend `RoleRepository` to write one.
 */
export type RoleRepositoryConstructor = new (
  ...args: ConstructorParameters<typeof RoleRepository>
) => RoleRepositoryInterface;

/**
 * A repository class built once per `forFeature` assignment key, around that
 * key's repository. Extend `RoleAssignmentRepository` to write one.
 */
export type RoleAssignmentRepositoryConstructor = new (
  ...args: ConstructorParameters<typeof RoleAssignmentRepository>
) => RoleAssignmentRepositoryInterface;

export interface RoleExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  repositories?: {
    role?: RoleRepositoryConstructor;
    roleAssignment?: RoleAssignmentRepositoryConstructor;
  };
}
