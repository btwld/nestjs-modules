import { z } from 'zod';

import { withNamedComponent } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `User` class, shaped to match the canonical
 * Swagger Petstore v3 spec (`petstore-upstream.json`) exactly — no domain
 * interface exists for these free-standing petstore fixtures, so there is
 * no `conformsTo` to apply.
 */
export const userSchema = withNamedComponent(
  z.object({
    id: z.number().int().meta({ format: 'int64' }).optional(),
    username: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    phone: z.string().optional(),
    userStatus: z.number().int().meta({ format: 'int32' }).optional(),
  }),
  'User',
);
