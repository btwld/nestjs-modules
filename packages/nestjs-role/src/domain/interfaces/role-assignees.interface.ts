import { type ReferenceIdInterface } from '@concepta/nestjs-core';

import { type RoleRelationInterface } from './role-relation.interface.js';

export interface RoleAssigneesInterface<
  T extends ReferenceIdInterface & RoleRelationInterface =
    ReferenceIdInterface & RoleRelationInterface,
> {
  assignees: T[];
}
