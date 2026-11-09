import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type InvitationCreatableInterface } from '../../domain/interfaces/invitation-creatable.interface.js';

import { invitationSchema } from './invitation.schema.js';

export const invitationCreateSchema = withOpenApi(
  conformsTo<InvitationCreatableInterface>()(
    invitationSchema.pick({
      category: true,
      userId: true,
      code: true,
      constraints: true,
    }),
  ),
);
