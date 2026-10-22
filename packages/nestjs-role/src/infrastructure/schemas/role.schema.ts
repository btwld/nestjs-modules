import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';
import { mutableAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { type RoleInterface } from '../../domain/interfaces/role.interface.js';

export const roleSchema = withNamedComponent(
  conformsTo<RoleInterface>()(
    mutableAggregateSchema.extend({
      name: z.string().meta({ description: 'Name of the role' }),
      description: z.string().meta({ description: 'Description of the role' }),
    }),
  ),
  'Role',
);
