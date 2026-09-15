import { CrudUpdateCommand } from '@concepta/nestjs-crud';

import { type InvitationAcceptableInterface } from '../../../../domain/interfaces/invitation-acceptable.interface.js';

export class AcceptInvitationRequest extends CrudUpdateCommand<
  InvitationAcceptableInterface,
  InvitationAcceptableInterface
> {}
