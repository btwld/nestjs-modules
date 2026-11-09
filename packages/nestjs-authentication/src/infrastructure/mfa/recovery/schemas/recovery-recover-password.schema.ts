import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type RecoveryRecoverPasswordParamsInterface } from '../../../../application/services/recovery/interfaces/recovery-recover-password-params.interface.js';

export const recoveryRecoverPasswordSchema = withOpenApi(
  conformsTo<RecoveryRecoverPasswordParamsInterface>()(
    z.object({
      email: z.string().email().meta({
        description:
          'Recover email password by providing an email that will receive a password reset link',
      }),
    }),
  ),
);
