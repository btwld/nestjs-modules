import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';

import { type AuthenticatedResponseInterface } from '../../domain/interfaces/authenticated-response.interface.js';

export const authenticationResponseSchema = withNamedComponent(
  conformsTo<AuthenticatedResponseInterface>()(
    z.object({
      accessToken: z.string().meta({
        description: 'JWT access token to use for request authorization.',
      }),
      refreshToken: z.string().meta({
        description:
          'JWT refresh token to use for obtaining a new access token.',
      }),
    }),
  ),
  'AuthenticationResponse',
);
