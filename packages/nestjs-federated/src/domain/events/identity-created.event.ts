import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type IdentityInterface } from '../interfaces/identity.interface.js';

export class IdentityCreatedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly identity: IdentityInterface,
  ) {}
}
