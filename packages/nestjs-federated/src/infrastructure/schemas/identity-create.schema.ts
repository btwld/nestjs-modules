import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type IdentityCreatableInterface } from '../../domain/interfaces/identity-creatable.interface.js';

import { identitySchema } from './identity.schema.js';

export const identityCreateSchema = withOpenApi(
  conformsTo<IdentityCreatableInterface>()(
    identitySchema.pick({ provider: true, subject: true, user: true }),
  ),
);
