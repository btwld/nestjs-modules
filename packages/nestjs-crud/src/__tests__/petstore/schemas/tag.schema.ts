import { z } from 'zod';

import { withNamedComponent } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `Tag` class, shaped to match the canonical
 * Swagger Petstore v3 spec (`petstore-upstream.json`) exactly — no domain
 * interface exists for these free-standing petstore fixtures, so there is
 * no `conformsTo` to apply.
 */
export const tagSchema = withNamedComponent(
  z.object({
    id: z.number().int().meta({ format: 'int64' }).optional(),
    name: z.string().optional(),
  }),
  'Tag',
);
