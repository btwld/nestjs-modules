import { type Provider, type Type } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type RoleEntityInterface } from '../../domain/interfaces/role-entity.interface.js';
import { type RoleRepositoryInterface } from '../../domain/repositories/role-repository.interface.js';
import { ROLE_CUSTOM_REPOSITORY_TOKEN } from '../../role.constants.js';
import { RoleMapper } from '../persistence/role.mapper.js';
import { RoleRepository } from '../persistence/role.repository.js';

/**
 * Generates a dynamic repository token for a given Role entity key.
 *
 * @param entityKey - Entity key to generate the repository token for
 */
export function getDynamicRoleRepositoryToken(entityKey: string): string {
  return `ROLE_REPOSITORY_${entityKey.toUpperCase()}`;
}

export function createRoleRepositoryProvider(entityKey: string): Provider {
  return {
    provide: getDynamicRoleRepositoryToken(entityKey),
    inject: [
      getDynamicRepositoryToken(entityKey),
      RoleMapper,
      { token: ROLE_CUSTOM_REPOSITORY_TOKEN, optional: true },
    ],
    useFactory: (
      repository: RepositoryInterface<RoleEntityInterface>,
      mapper: RoleMapper,
      customRepo?: Type<RoleRepositoryInterface>,
    ) => {
      const RepoClass = customRepo ?? RoleRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
