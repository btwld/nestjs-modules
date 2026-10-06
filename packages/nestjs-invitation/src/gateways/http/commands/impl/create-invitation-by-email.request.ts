import { CrudCreateCommand } from '@concepta/nestjs-crud';

import { type InvitationCreatableByEmailInterface } from '../../../../domain/interfaces/invitation-creatable-by-email.interface.js';
import { type InvitationInterface } from '../../../../domain/interfaces/invitation.interface.js';

export class CreateInvitationByEmailRequest extends CrudCreateCommand<
  InvitationInterface,
  InvitationCreatableByEmailInterface
> {}
