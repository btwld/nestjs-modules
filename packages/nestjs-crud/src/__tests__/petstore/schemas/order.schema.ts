import { z } from 'zod';

import { withNamedComponent } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `Order` class, shaped to match the
 * canonical Swagger Petstore v3 spec (`petstore-upstream.json`) exactly —
 * no domain interface exists for these free-standing petstore fixtures, so
 * there is no `conformsTo` to apply. `shipDate` uses the shared `z.date()`
 * override (`open-api.util.ts`'s `jsonSchemaLibraryOptions`) which already
 * renders it as `{ type: 'string', format: 'date-time' }` — no extra
 * wrapper needed.
 */
export const orderSchema = withNamedComponent(
  z.object({
    id: z.number().int().meta({ format: 'int64' }).optional(),
    petId: z.number().int().meta({ format: 'int64' }).optional(),
    quantity: z.number().int().meta({ format: 'int32' }).optional(),
    shipDate: z.date().optional(),
    status: z.enum(['placed', 'approved', 'delivered']).optional(),
    complete: z.boolean().optional(),
  }),
  'Order',
);
