import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type RecoveryValidatePasscodeParamsInterface } from '../../../../application/services/recovery/interfaces/recovery-validate-passcode-params.interface.js';

export const recoveryValidatePasscodeSchema = withOpenApi(
  conformsTo<RecoveryValidatePasscodeParamsInterface>()(
    z.object({
      passcode: z.string().max(36).meta({
        description: 'User passcode used to verify if it valid or not.',
      }),
    }),
  ),
);
