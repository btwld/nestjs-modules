import { type Provider } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type UserEntityInterface } from '../../domain/interfaces/user-entity.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../user.constants.js';
import { type UserRepositoryConstructor } from '../config/interfaces/user-extras.interface.js';
import { UserMapper } from '../persistence/user.mapper.js';
import { UserRepository } from '../persistence/user.repository.js';

export function createUserRepositoryProvider(
  entityKey: string,
  customRepository?: UserRepositoryConstructor,
): Provider {
  return {
    provide: USER_REPOSITORY_TOKEN,
    inject: [getDynamicRepositoryToken(entityKey), UserMapper],
    useFactory: (
      repository: RepositoryInterface<UserEntityInterface>,
      mapper: UserMapper,
    ) => {
      const RepoClass = customRepository ?? UserRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
