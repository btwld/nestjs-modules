import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type RoleUpdatableInterface } from '../../domain/interfaces/role-updatable.interface.js';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`). Unlike `roleCreateSchema`, both fields are
 * `.optional()` — this is a partial update, so an omitted field must mean
 * "don't touch it", not "set it to `''`". A present-but-blank `name` is
 * still rejected (`.trim().min(1)`); an empty body (`{}`) is accepted as a
 * no-op patch.
 */
export const roleUpdateSchema = withOpenApi(
  conformsTo<RoleUpdatableInterface>()(
    z.object({
      name: z
        .string()
        .trim()
        .min(1)
        .optional()
        .meta({ description: 'Name of the role' }),
      description: z
        .string()
        .optional()
        .meta({ description: 'Description of the role' }),
    }),
  ),
);
