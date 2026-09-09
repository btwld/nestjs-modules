import { type Provider, type Type } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type UserCredentialEntityInterface } from '../../domain/interfaces/user-credential-entity.interface.js';
import { type UserCredentialsRepositoryInterface } from '../../domain/repositories/user-credentials-repository.interface.js';
import { USER_CREDENTIALS_REPOSITORY_TOKEN } from '../../user.constants.js';
import { UserCredentialsMapper } from '../persistence/user-credentials.mapper.js';
import { UserCredentialsRepository } from '../persistence/user-credentials.repository.js';

export function createUserCredentialsRepositoryProvider(
  entityKey?: string,
  customRepository?: Type<UserCredentialsRepositoryInterface>,
): Provider[] {
  if (customRepository) {
    return [
      {
        provide: USER_CREDENTIALS_REPOSITORY_TOKEN,
        useClass: customRepository,
      },
    ];
  }

  if (!entityKey) {
    return [];
  }

  return [
    {
      provide: USER_CREDENTIALS_REPOSITORY_TOKEN,
      inject: [
        {
          token: getDynamicRepositoryToken(entityKey),
          optional: true,
        },
        UserCredentialsMapper,
      ],
      useFactory: (
        repository:
          RepositoryInterface<UserCredentialEntityInterface> | undefined,
        mapper: UserCredentialsMapper,
      ) => {
        if (repository) {
          return new UserCredentialsRepository(repository, mapper);
        }
        return undefined;
      },
    },
  ];
}
