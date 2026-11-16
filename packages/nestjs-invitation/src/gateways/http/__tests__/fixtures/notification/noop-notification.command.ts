import { type PlainLiteralObject } from '@nestjs/common';

import { type InvitationEventPayloadInterface } from '../../../../../domain/events/interfaces/invitation-event-payload.interface.js';
import {
  type SendAcceptedNotificationCommandInterface,
  type SendInvitationNotificationCommandInterface,
} from '../../../../../domain/ports/invitation-notification.port.js';

export class NoopSendInvitationNotificationCommand implements SendInvitationNotificationCommandInterface {
  constructor(params: SendInvitationNotificationCommandInterface) {
    Object.assign(this, params);
  }

  ctx!: PlainLiteralObject;
  invitation!: InvitationEventPayloadInterface;
  passcode!: string;
  tokenExp!: Date;
}

export class NoopSendAcceptedNotificationCommand implements SendAcceptedNotificationCommandInterface {
  constructor(params: SendAcceptedNotificationCommandInterface) {
    Object.assign(this, params);
  }

  ctx!: PlainLiteralObject;
  invitation!: InvitationEventPayloadInterface;
}
