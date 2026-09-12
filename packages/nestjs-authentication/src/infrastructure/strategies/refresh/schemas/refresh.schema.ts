import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type AuthenticationRefreshInterface } from '../../../../domain/interfaces/authentication-refresh.interface.js';

export const refreshSchema = withOpenApi(
  conformsTo<AuthenticationRefreshInterface>()(
    z.object({
      refreshToken: z.jwt().meta({
        description:
          'JWT refresh token to use for obtaining a new pair of tokens.',
      }),
    }),
  ),
);
