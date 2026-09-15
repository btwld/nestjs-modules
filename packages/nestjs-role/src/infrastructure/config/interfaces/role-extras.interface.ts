import { type DynamicModule, type Provider, type Type } from '@nestjs/common';

import { type RoleAssignmentRepositoryInterface } from '../../../domain/repositories/role-assignment-repository.interface.js';
import { type RoleRepositoryInterface } from '../../../domain/repositories/role-repository.interface.js';

export interface RoleExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  repositories?: {
    role?: Type<RoleRepositoryInterface>;
    roleAssignment?: Type<RoleAssignmentRepositoryInterface>;
  };
}
