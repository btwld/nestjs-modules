import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { InvitationDispatchedEvent } from '../../domain/events/invitation-dispatched.event.js';
import { InvitationNotificationPort } from '../../domain/ports/invitation-notification.port.js';

@EventsHandler(InvitationDispatchedEvent)
export class InvitationDispatchedListener implements IEventHandler<InvitationDispatchedEvent> {
  constructor(private readonly notificationPort: InvitationNotificationPort) {}

  async handle(event: InvitationDispatchedEvent): Promise<void> {
    const { invitation, eventContext } = event;
    const passcode = eventContext.getMeta('passcode');
    const tokenExp = eventContext.getMeta('tokenExp');

    await this.notificationPort.sendInvitation({}, invitation, {
      passcode,
      tokenExp,
    });
  }
}
