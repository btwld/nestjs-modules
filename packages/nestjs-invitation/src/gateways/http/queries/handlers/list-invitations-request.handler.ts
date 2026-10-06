import { CrudListHandler } from '@concepta/nestjs-crud';

import { type InvitationInterface } from '../../../../domain/interfaces/invitation.interface.js';

export class ListInvitationsRequestHandler extends CrudListHandler<InvitationInterface> {}
