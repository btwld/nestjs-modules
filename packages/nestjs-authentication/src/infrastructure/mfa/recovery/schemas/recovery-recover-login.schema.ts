import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type RecoveryRecoverLoginParamsInterface } from '../../../../application/services/recovery/interfaces/recovery-recover-login-params.interface.js';

export const recoveryRecoverLoginSchema = withOpenApi(
  conformsTo<RecoveryRecoverLoginParamsInterface>()(
    z.object({
      email: z.string().email().meta({
        description:
          'Recover email login by providing an email that will receive an username',
      }),
    }),
  ),
);
