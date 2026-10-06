import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `NoteDto` — no domain interface exists for
 * these TypeORM test fixtures, so there is no `conformsTo` to apply.
 */
export const noteSchema = withOpenApi(
  z.object({
    id: z.number(),
    revisionId: z.number(),
  }),
);
