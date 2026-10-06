import { type Provider, type Type } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type UserEntityInterface } from '../../domain/interfaces/user-entity.interface.js';
import { type UserRepositoryInterface } from '../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../user.constants.js';
import { UserMapper } from '../persistence/user.mapper.js';
import { UserRepository } from '../persistence/user.repository.js';

export function createUserRepositoryProvider(
  entityKey: string,
  customRepository?: Type<UserRepositoryInterface>,
): Provider[] {
  if (customRepository) {
    return [{ provide: USER_REPOSITORY_TOKEN, useClass: customRepository }];
  }

  return [
    {
      provide: USER_REPOSITORY_TOKEN,
      inject: [getDynamicRepositoryToken(entityKey), UserMapper],
      useFactory: (
        repository: RepositoryInterface<UserEntityInterface>,
        mapper: UserMapper,
      ) => {
        return new UserRepository(repository, mapper);
      },
    },
  ];
}
