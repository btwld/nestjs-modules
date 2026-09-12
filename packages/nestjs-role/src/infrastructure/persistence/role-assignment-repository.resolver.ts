import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { RoleAssignmentRepositoryResolverInterface } from '../../domain/repositories/role-assignment-repository-resolver.interface.js';
import { RoleAssignmentRepositoryInterface } from '../../domain/repositories/role-assignment-repository.interface.js';
import { RoleEntityNotFoundException } from '../exceptions/role-entity-not-found.exception.js';
import { getDynamicRoleAssignmentRepositoryToken } from '../utils/create-role-assignment-repository-provider.js';

@Injectable()
export class RoleAssignmentRepositoryResolver implements RoleAssignmentRepositoryResolverInterface {
  constructor(private readonly moduleRef: ModuleRef) {}

  resolve(entityKey: string): RoleAssignmentRepositoryInterface {
    const token = getDynamicRoleAssignmentRepositoryToken(entityKey);

    try {
      return this.moduleRef.get<RoleAssignmentRepositoryInterface>(token, {
        strict: false,
      });
    } catch (error) {
      throw new RoleEntityNotFoundException(entityKey, {
        originalError: error,
      });
    }
  }
}
