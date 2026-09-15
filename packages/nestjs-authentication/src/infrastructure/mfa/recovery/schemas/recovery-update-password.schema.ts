import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type RecoveryUpdatePasswordParamsInterface } from '../../../../application/services/recovery/interfaces/recovery-update-password-params.interface.js';

export const recoveryUpdatePasswordSchema = withOpenApi(
  conformsTo<RecoveryUpdatePasswordParamsInterface>()(
    z.object({
      passcode: z
        .string()
        .max(36)
        .meta({ description: 'Passcode used to reset account password' }),
      newPassword: z
        .string()
        .max(72)
        .meta({ description: 'New password account' }),
    }),
  ),
);
