import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';
import { domainAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { type RoleAssignmentInterface } from '../../domain/interfaces/role-assignment.interface.js';

export const roleAssignmentSchema = withNamedComponent(
  conformsTo<RoleAssignmentInterface>()(
    domainAggregateSchema.extend({
      roleId: z.string().min(1).meta({ description: 'Role ID' }),
      assigneeId: z.string().min(1).meta({ description: 'Assignee ID' }),
    }),
  ),
  'RoleAssignment',
);
