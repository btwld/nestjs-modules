import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';
import { type PasswordStorageInterface } from '@concepta/nestjs-password';

/**
 * Kept for public-API/export parity (still exported from `index.ts`) even
 * though it's no longer part of `userCreateSchema` — see that file for why
 * the create path now uses plaintext `password` instead. Not consumed by
 * any wired CRUD operation. Not a named OpenAPI component.
 */
export const userPasswordHashSchema = withOpenApi(
  conformsTo<PasswordStorageInterface>()(
    z.object({
      passwordHash: z.string().meta({ description: 'Password hash' }),
    }),
  ),
);
