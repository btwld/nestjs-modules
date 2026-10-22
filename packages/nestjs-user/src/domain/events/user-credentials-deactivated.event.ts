import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type UserCredentialsEventPayloadInterface } from './interfaces/user-credentials-event-payload.interface.js';

export class UserCredentialsDeactivatedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly credentials: UserCredentialsEventPayloadInterface,
  ) {}
}
