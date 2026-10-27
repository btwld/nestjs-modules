import { CrudReadQuery } from '@concepta/nestjs-crud';

import { type InvitationInterface } from '../../../../domain/interfaces/invitation.interface.js';

export class ReadInvitationRequest extends CrudReadQuery<InvitationInterface> {}
