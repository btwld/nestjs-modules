import { z } from 'zod';

import {
  conformsTo,
  referenceIdSchema,
  withNamedComponent,
} from '@concepta/nestjs-core';
import { domainAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { type IdentityInterface } from '../../domain/interfaces/identity.interface.js';

export const identitySchema = withNamedComponent(
  conformsTo<IdentityInterface>()(
    domainAggregateSchema.extend({
      provider: z.string().meta({ description: 'Provider of the identity' }),
      subject: z.string().meta({ description: 'Subject of the identity' }),
      user: referenceIdSchema.meta({ description: 'User reference' }),
    }),
  ),
  'Identity',
);
