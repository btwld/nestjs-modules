import { z } from 'zod';

import { withNamedComponent } from '@concepta/nestjs-core';

import { categorySchema } from './category.schema.js';
import { tagSchema } from './tag.schema.js';

/**
 * Zod equivalent of the legacy `Pet` class, shaped to match the canonical
 * Swagger Petstore v3 spec (`petstore-upstream.json`) exactly — no domain
 * interface exists for these free-standing petstore fixtures, so there is
 * no `conformsTo` to apply. `category`/`tags` nest the already-named
 * `Category`/`Tag` components directly so the OpenAPI converter hoists
 * them as `$ref`s instead of inlining a duplicate shape.
 */
export const petSchema = withNamedComponent(
  z.object({
    id: z.number().int().meta({ format: 'int64' }).optional(),
    name: z.string(),
    category: categorySchema.optional(),
    photoUrls: z.array(z.string()),
    tags: z.array(tagSchema).optional(),
    status: z.enum(['available', 'pending', 'sold']).optional(),
  }),
  'Pet',
);
