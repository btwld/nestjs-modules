import { type Provider, type Type } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type IdentityRepositoryInterface } from '../../domain/repositories/identity-repository.interface.js';
import { FEDERATED_MODULE_IDENTITY_REPOSITORY_TOKEN } from '../../federated.constants.js';
import { IdentityMapper } from '../persistence/identity.mapper.js';
import { IdentityRepository } from '../persistence/identity.repository.js';
import { type IdentityEntityInterface } from '../persistence/interfaces/identity-entity.interface.js';

export function createIdentityRepositoryProvider(
  entityKey: string,
  customRepository?: Type<IdentityRepositoryInterface>,
): Provider[] {
  if (customRepository) {
    return [
      {
        provide: FEDERATED_MODULE_IDENTITY_REPOSITORY_TOKEN,
        useClass: customRepository,
      },
    ];
  }

  return [
    {
      provide: FEDERATED_MODULE_IDENTITY_REPOSITORY_TOKEN,
      inject: [getDynamicRepositoryToken(entityKey), IdentityMapper],
      useFactory: (
        repository: RepositoryInterface<IdentityEntityInterface>,
        mapper: IdentityMapper,
      ) => new IdentityRepository(repository, mapper),
    },
  ];
}
