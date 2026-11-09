import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `UserProfileCreateDto` — faithful
 * reproduction. Converted for API parity despite zero live consumers
 * (see `user-profile.schema.ts`'s docstring).
 */
export const userProfileCreateSchema = withOpenApi(
  z.object({
    userId: z.number(),
    nickName: z.string().max(100).optional(),
    favoriteColor: z.string().max(50).optional(),
  }),
);
