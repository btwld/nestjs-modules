import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { AppContextHost, CorrelationCtx } from '@concepta/nestjs-core';

import { InvitationRevokedEvent } from '../../domain/events/invitation-revoked.event.js';
import { InvitationOtpPort } from '../../domain/ports/invitation-otp.port.js';

@EventsHandler(InvitationRevokedEvent)
export class InvitationRevokedListener implements IEventHandler<InvitationRevokedEvent> {
  constructor(private readonly otpPort: InvitationOtpPort) {}

  async handle(event: InvitationRevokedEvent): Promise<void> {
    const { category, userId } = event.invitation;

    const appCtx = new AppContextHost();
    appCtx.defineOverlay(CorrelationCtx, {
      correlationId: event.eventContext.getHeader('correlationId'),
      // this listener reacting to the event is itself now the origin of a
      // new inbound operation — its causationId is whatever caused the
      // event it's reacting to, copied down one level (Rails Event Store's
      // rule), not the event's own correlationId.
      causationId: event.eventContext.getHeader('causationId'),
    });

    await this.otpPort.clear(appCtx, category, userId);
  }
}
