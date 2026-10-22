import { withNamedComponent } from '@concepta/nestjs-core';
import { paginatedSchema } from '@concepta/nestjs-crud';

import { invitationSchema } from './invitation.schema.js';

export const invitationPaginatedSchema = withNamedComponent(
  paginatedSchema(invitationSchema),
  'InvitationPaginated',
);
