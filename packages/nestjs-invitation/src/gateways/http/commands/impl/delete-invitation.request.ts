import { CrudDeleteCommand } from '@concepta/nestjs-crud';

import { type InvitationInterface } from '../../../../domain/interfaces/invitation.interface.js';

export class DeleteInvitationRequest extends CrudDeleteCommand<InvitationInterface> {}
