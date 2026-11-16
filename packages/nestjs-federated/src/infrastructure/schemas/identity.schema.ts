import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';
import { mutableAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { type IdentityInterface } from '../../domain/interfaces/identity.interface.js';

export const identitySchema = withNamedComponent(
  conformsTo<IdentityInterface>()(
    mutableAggregateSchema.extend({
      provider: z.string().meta({ description: 'Provider of the identity' }),
      subject: z.string().meta({ description: 'Subject of the identity' }),
      userId: z
        .string()
        .meta({ description: 'Id of the user this identity belongs to' }),
    }),
  ),
  'Identity',
);
