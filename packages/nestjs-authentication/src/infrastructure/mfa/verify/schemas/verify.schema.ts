import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type VerifySendParamsInterface } from '../../../../application/services/verify/interfaces/verify-send-params.interface.js';

export const verifySchema = withOpenApi(
  conformsTo<VerifySendParamsInterface>()(
    z.object({
      email: z.string().email().meta({
        description:
          'Verify email by providing an email that will receive a confirmation link',
      }),
    }),
  ),
);
