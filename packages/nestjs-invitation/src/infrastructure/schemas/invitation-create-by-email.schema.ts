import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type InvitationCreatableByEmailInterface } from '../../domain/interfaces/invitation-creatable-by-email.interface.js';

import { invitationCreateSchema } from './invitation-create.schema.js';

export const invitationCreateByEmailSchema = withOpenApi(
  conformsTo<InvitationCreatableByEmailInterface>()(
    invitationCreateSchema.pick({ category: true, constraints: true }).extend({
      email: z
        .string()
        .email()
        .meta({ description: 'Email that the invitation will be sent to' }),
    }),
  ),
);
