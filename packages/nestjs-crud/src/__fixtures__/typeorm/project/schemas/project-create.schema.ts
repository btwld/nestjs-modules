import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `ProjectCreateDto`. Per the Phase 3 plan
 * decision, `name` is FIXED to required rather than faithfully
 * reproduced: it was `@IsOptional()` in the legacy DTO despite
 * `ProjectEntity.name` being `nullable: false, unique: true` — a real
 * DTO/entity mismatch with no external contract to preserve. The other
 * fields stay optional, matching both the legacy decorators and the
 * entity (`description`/`isActive` are nullable/defaulted;
 * `companyId` is set separately by the handler, not client-supplied here).
 */
export const projectCreateSchema = withOpenApi(
  z.object({
    name: z.string().max(100),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    companyId: z.number().optional(),
  }),
);
