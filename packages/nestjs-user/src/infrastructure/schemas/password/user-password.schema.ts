import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';
import { type PasswordPlainInterface } from '@concepta/nestjs-password';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`).
 */
export const userPasswordSchema = withOpenApi(
  conformsTo<PasswordPlainInterface>()(
    z.object({
      password: z
        .string()
        .min(8)
        .meta({ description: 'Plain text password to set' }),
    }),
  ),
);
