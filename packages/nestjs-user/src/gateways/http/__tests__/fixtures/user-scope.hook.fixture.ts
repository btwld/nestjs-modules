import { Injectable } from '@nestjs/common';

import { AppContextInterface } from '@concepta/nestjs-core';
import {
  BeforeFindOne,
  RepoHook,
  RepositoryFindOneOptions,
  RepoSpec,
  Where,
} from '@concepta/nestjs-repository';

import { UserCredentialEntityInterface } from '../../../../domain/interfaces/user-credential-entity.interface.js';
import { UserEntityInterface } from '../../../../domain/interfaces/user-entity.interface.js';

import { AuthorizedUserRef } from './authorized-user.local.fixture.js';

@RepoHook()
@Injectable()
export class UserScopeHookFixture {
  @BeforeFindOne(RepoSpec.isEntity('user'))
  async scopeUserLookup(
    options: RepositoryFindOneOptions<UserEntityInterface>,
    ctx?: AppContextInterface,
  ): Promise<RepositoryFindOneOptions<UserEntityInterface>> {
    const authorizedUser = ctx?.supports(AuthorizedUserRef)
      ? ctx.with(AuthorizedUserRef)
      : undefined;

    if (!authorizedUser?.id) {
      return options;
    }

    const condition = Where.eq('id', authorizedUser.id);

    return {
      ...options,
      where: options.where ? Where.and(options.where, condition) : condition,
    };
  }

  @BeforeFindOne(RepoSpec.isEntity('user-credentials'))
  async scopeCredentialsLookup(
    options: RepositoryFindOneOptions<UserCredentialEntityInterface>,
    ctx?: AppContextInterface,
  ): Promise<RepositoryFindOneOptions<UserCredentialEntityInterface>> {
    const authorizedUser = ctx?.supports(AuthorizedUserRef)
      ? ctx.with(AuthorizedUserRef)
      : undefined;

    if (!authorizedUser?.id) {
      return options;
    }

    const userCondition = Where.eq('userId', authorizedUser.id);

    return {
      ...options,
      where: options.where
        ? Where.and(options.where, userCondition)
        : userCondition,
    };
  }
}
