import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `DeviceDto` — no domain interface exists
 * for these TypeORM test fixtures, so there is no `conformsTo` to apply.
 *
 * `description` is `.nullable()`, not just `.optional()`: `DeviceEntity.description`
 * is a `nullable: true` column with no default, so an unset value reads
 * back from the DB as `null`, not `undefined` — matches the
 * `CompanyEntity.description`/`UserEntity.deletedAt` fidelity fix elsewhere
 * in these fixtures.
 */
export const deviceSchema = withOpenApi(
  z.object({
    deviceKey: z.string(),
    description: z.string().nullable().optional(),
  }),
);
