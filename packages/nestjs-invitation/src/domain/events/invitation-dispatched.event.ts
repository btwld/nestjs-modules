import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type InvitationDispatchedMetadataInterface } from './interfaces/invitation-dispatched-metadata.interface.js';
import { type InvitationEventHeaderInterface } from './interfaces/invitation-event-header.interface.js';
import { type InvitationEventPayloadInterface } from './interfaces/invitation-event-payload.interface.js';

export class InvitationDispatchedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost<
      InvitationEventHeaderInterface,
      InvitationDispatchedMetadataInterface
    >,
    public readonly invitation: InvitationEventPayloadInterface,
  ) {}
}
