import { z } from 'zod';

import { type ReferenceIdInterface } from '../../domain/reference/interfaces/reference-id.interface.js';

import { conformsTo } from './conforms-to.util.js';

/**
 * Reference-id schema. Composed into concrete entity schemas via
 * `.extend()` — see `audit.schema.ts` for why it is not wrapped with
 * `withOpenApi`/`withNamedComponent` itself.
 */
export const referenceIdSchema = conformsTo<ReferenceIdInterface>()(
  z.object({
    id: z.string(),
  }),
);
