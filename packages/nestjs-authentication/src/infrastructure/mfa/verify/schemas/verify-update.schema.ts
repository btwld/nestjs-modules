import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type VerifyConfirmParamsInterface } from '../../../../application/services/verify/interfaces/verify-confirm-params.interface.js';

export const verifyUpdateSchema = withOpenApi(
  conformsTo<VerifyConfirmParamsInterface>()(
    z.object({
      passcode: z
        .string()
        .max(36)
        .meta({ description: 'Passcode used to confirm account' }),
    }),
  ),
);
