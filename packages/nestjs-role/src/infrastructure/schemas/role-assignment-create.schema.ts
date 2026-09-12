import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type RoleAssignmentCreatableInterface } from '../../domain/interfaces/role-assignment-creatable.interface.js';

import { roleAssignmentSchema } from './role-assignment.schema.js';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`).
 */
export const roleAssignmentCreateSchema = withOpenApi(
  conformsTo<RoleAssignmentCreatableInterface>()(
    roleAssignmentSchema.pick({ roleId: true, assigneeId: true }),
  ),
);
