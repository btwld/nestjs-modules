import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `CompanyCreateDto`. Per the Phase 3 plan
 * decision, this fixture's optionality is FIXED to match `CompanyEntity`
 * rather than faithfully reproduced: `domain` was `@IsOptional()` in the
 * legacy DTO despite `CompanyEntity.domain` being `nullable: false` and
 * `unique: true` — a real DTO/entity mismatch with no external contract
 * to preserve, so it is now required. `description` stays optional,
 * matching both the legacy `@IsOptional()` and `CompanyEntity.description`
 * (`nullable: true`) — no mismatch there.
 */
export const companyCreateSchema = withOpenApi(
  z.object({
    name: z.string().max(100),
    domain: z.string().max(100),
    description: z.string().max(100).optional(),
  }),
);
