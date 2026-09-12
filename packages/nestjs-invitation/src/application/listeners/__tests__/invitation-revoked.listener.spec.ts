import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type AppContextHost, CorrelationCtx } from '@concepta/nestjs-core';
import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { InvitationRevokedEvent } from '../../../domain/events/invitation-revoked.event.js';
import { type InvitationOtpPort } from '../../../domain/ports/invitation-otp.port.js';
import { InvitationRevokedListener } from '../invitation-revoked.listener.js';

describe(InvitationRevokedListener.name, () => {
  let listener: InvitationRevokedListener;
  let otpPort: DeepMockProxy<InvitationOtpPort>;

  beforeEach(() => {
    otpPort = mockDeep<InvitationOtpPort>();
    listener = new InvitationRevokedListener(otpPort);
  });

  it('should call otpPort.clear with category and userId from event', async () => {
    const eventContext = createTestEventContext({}, {});

    const event = new InvitationRevokedEvent(eventContext, {
      id: 'inv-1',
      code: 'code-1',
      category: 'user',
      userId: 'user-1',
      constraints: undefined,
      dateAccepted: null,
      dateRevoked: new Date(),
      version: 1,
      dateCreated: new Date(),
      dateUpdated: new Date(),
      dateDeleted: null,
    });

    await listener.handle(event);

    expect(otpPort.clear).toHaveBeenCalledTimes(1);
    expect(otpPort.clear).toHaveBeenCalledWith(
      expect.anything(),
      'user',
      'user-1',
    );
  });

  it('should forward correlationId and advance causationId to the event own causationId', async () => {
    const eventContext = createTestEventContext({}, {});

    const event = new InvitationRevokedEvent(eventContext, {
      id: 'inv-1',
      code: 'code-1',
      category: 'user',
      userId: 'user-1',
      constraints: undefined,
      dateAccepted: null,
      dateRevoked: new Date(),
      version: 1,
      dateCreated: new Date(),
      dateUpdated: new Date(),
      dateDeleted: null,
    });

    await listener.handle(event);

    const forwardedCtx = otpPort.clear.mock.calls[0][0] as AppContextHost;
    const correlation = forwardedCtx.with(CorrelationCtx);

    expect(correlation).toEqual({
      correlationId: eventContext.getHeader('correlationId'),
      causationId: eventContext.getHeader('causationId'),
    });
  });
});
