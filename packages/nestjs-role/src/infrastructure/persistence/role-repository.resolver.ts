import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { RoleRepositoryResolverInterface } from '../../domain/repositories/role-repository-resolver.interface.js';
import { RoleRepositoryInterface } from '../../domain/repositories/role-repository.interface.js';
import { RoleEntityNotFoundException } from '../exceptions/role-entity-not-found.exception.js';
import { getDynamicRoleRepositoryToken } from '../utils/create-role-repository-provider.js';

@Injectable()
export class RoleRepositoryResolver implements RoleRepositoryResolverInterface {
  constructor(private readonly moduleRef: ModuleRef) {}

  resolve(entityKey: string): RoleRepositoryInterface {
    const token = getDynamicRoleRepositoryToken(entityKey);

    try {
      return this.moduleRef.get<RoleRepositoryInterface>(token, {
        strict: false,
      });
    } catch (error) {
      throw new RoleEntityNotFoundException(entityKey, {
        originalError: error,
      });
    }
  }
}
