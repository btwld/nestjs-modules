import { type Provider, type Type } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type RoleAssignmentEntityInterface } from '../../domain/interfaces/role-assignment-entity.interface.js';
import { type RoleAssignmentRepositoryInterface } from '../../domain/repositories/role-assignment-repository.interface.js';
import { ROLE_ASSIGNMENT_CUSTOM_REPOSITORY_TOKEN } from '../../role.constants.js';
import { RoleAssignmentMapper } from '../persistence/role-assignment.mapper.js';
import { RoleAssignmentRepository } from '../persistence/role-assignment.repository.js';

/**
 * Generates a dynamic repository token for a given Role Assignment entity key.
 *
 * @param entityKey - Entity key to generate the repository token for
 */
export function getDynamicRoleAssignmentRepositoryToken(
  entityKey: string,
): string {
  return `ROLE_ASSIGNMENT_REPOSITORY_${entityKey.toUpperCase()}`;
}

export function createRoleAssignmentRepositoryProvider(
  entityKey: string,
): Provider {
  return {
    provide: getDynamicRoleAssignmentRepositoryToken(entityKey),
    inject: [
      getDynamicRepositoryToken(entityKey),
      RoleAssignmentMapper,
      { token: ROLE_ASSIGNMENT_CUSTOM_REPOSITORY_TOKEN, optional: true },
    ],
    useFactory: (
      repository: RepositoryInterface<RoleAssignmentEntityInterface>,
      mapper: RoleAssignmentMapper,
      customRepo?: Type<RoleAssignmentRepositoryInterface>,
    ) => {
      const RepoClass = customRepo ?? RoleAssignmentRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
