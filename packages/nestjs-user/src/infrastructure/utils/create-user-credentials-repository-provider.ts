import { type Provider } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type UserCredentialEntityInterface } from '../../domain/interfaces/user-credential-entity.interface.js';
import { USER_CREDENTIALS_REPOSITORY_TOKEN } from '../../user.constants.js';
import { type UserCredentialsRepositoryConstructor } from '../config/interfaces/user-extras.interface.js';
import { UserCredentialsMapper } from '../persistence/user-credentials.mapper.js';
import { UserCredentialsRepository } from '../persistence/user-credentials.repository.js';

export function createUserCredentialsRepositoryProvider(
  entityKey: string,
  customRepository?: UserCredentialsRepositoryConstructor,
): Provider {
  return {
    provide: USER_CREDENTIALS_REPOSITORY_TOKEN,
    inject: [getDynamicRepositoryToken(entityKey), UserCredentialsMapper],
    useFactory: (
      repository: RepositoryInterface<UserCredentialEntityInterface>,
      mapper: UserCredentialsMapper,
    ) => {
      const RepoClass = customRepository ?? UserCredentialsRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
