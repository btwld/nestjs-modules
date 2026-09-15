import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type AuthenticationLoginInterface } from '../../../../domain/interfaces/authentication-login.interface.js';

export const localLoginSchema = withOpenApi(
  conformsTo<AuthenticationLoginInterface>()(
    z.object({
      username: z.string().max(255).meta({ description: 'Username' }),
      password: z.string().max(72).meta({ description: 'Password' }),
    }),
  ),
);
