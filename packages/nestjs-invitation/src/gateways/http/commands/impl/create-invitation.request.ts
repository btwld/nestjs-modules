import { CrudCreateCommand } from '@concepta/nestjs-crud';

import { type InvitationCreatableInterface } from '../../../../domain/interfaces/invitation-creatable.interface.js';
import { type InvitationInterface } from '../../../../domain/interfaces/invitation.interface.js';

export class CreateInvitationRequest extends CrudCreateCommand<
  InvitationInterface,
  InvitationCreatableInterface
> {}
