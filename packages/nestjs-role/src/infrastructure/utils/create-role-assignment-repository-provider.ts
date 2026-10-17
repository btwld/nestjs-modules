import { type Provider } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type RoleAssignmentEntityInterface } from '../../domain/interfaces/role-assignment-entity.interface.js';
import { ROLE_ASSIGNMENT_CUSTOM_REPOSITORY_TOKEN } from '../../role.constants.js';
import { type RoleAssignmentRepositoryConstructor } from '../config/interfaces/role-extras.interface.js';
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
      ROLE_ASSIGNMENT_CUSTOM_REPOSITORY_TOKEN,
    ],
    useFactory: (
      repository: RepositoryInterface<RoleAssignmentEntityInterface>,
      mapper: RoleAssignmentMapper,
      customRepo: RoleAssignmentRepositoryConstructor | null,
    ) => {
      const RepoClass = customRepo ?? RoleAssignmentRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
