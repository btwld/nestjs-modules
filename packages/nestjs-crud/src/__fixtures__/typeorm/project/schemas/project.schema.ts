import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `ProjectDto` — no domain interface exists
 * for these TypeORM test fixtures, so there is no `conformsTo` to apply.
 */
export const projectSchema = withOpenApi(
  z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    companyId: z.number().optional(),
  }),
);
