import { type PlainLiteralObject } from '@nestjs/common';
import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type InvitationEventHeaderInterface } from './interfaces/invitation-event-header.interface.js';
import { type InvitationEventPayloadInterface } from './interfaces/invitation-event-payload.interface.js';

export class InvitationAcceptedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost<InvitationEventHeaderInterface>,
    public readonly invitation: InvitationEventPayloadInterface,
    public readonly payload?: PlainLiteralObject,
  ) {}
}
