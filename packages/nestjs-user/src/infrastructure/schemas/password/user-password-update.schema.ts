import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

import { userPasswordSchema } from './user-password.schema.js';

/**
 * Used only as a request body — not a named OpenAPI component. `password`
 * is required (inherited from `userPasswordSchema`); `passwordCurrent` is
 * optional — its conditional requirement (the `requireCurrent` policy) is
 * enforced by `UserCredentialsService` as a runtime domain exception
 * (`UserPasswordCurrentInvalidException`), not by schema validation.
 */
export const userPasswordUpdateSchema = withOpenApi(
  userPasswordSchema.extend({
    passwordCurrent: z
      .string()
      .optional()
      .meta({ description: 'Current password to validate' }),
  }),
);
