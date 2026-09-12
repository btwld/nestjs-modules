import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `UserProfileDto` — no domain interface
 * exists for these TypeORM test fixtures, so there is no `conformsTo` to
 * apply. Converted for API parity even though this fixture directory has
 * zero live consumers today (confirmed via grep, matching the invitation
 * package's dead `RecoveryValidatePasscodeDto` precedent) — not silently
 * dropped as a side effect of this migration.
 */
export const userProfileSchema = withOpenApi(
  z.object({
    id: z.number().optional(),
    userId: z.number(),
    nickName: z.string().optional(),
    favoriteColor: z.string().optional(),
  }),
);
