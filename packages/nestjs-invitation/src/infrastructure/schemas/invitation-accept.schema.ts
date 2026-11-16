import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type InvitationAcceptableInterface } from '../../domain/interfaces/invitation-acceptable.interface.js';

export const invitationAcceptSchema = withOpenApi(
  conformsTo<InvitationAcceptableInterface>()(
    z.object({
      passcode: z.string().meta({ description: 'Passcode' }),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .meta({ description: 'Payload' }),
    }),
  ),
);
