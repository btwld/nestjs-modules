import { Command } from '@nestjs/cqrs';

import { type CrudContextInterface } from '@concepta/nestjs-crud';

export class SendInvitationRequest extends Command<void> {
  constructor(public readonly context: CrudContextInterface) {
    super();
  }
}
