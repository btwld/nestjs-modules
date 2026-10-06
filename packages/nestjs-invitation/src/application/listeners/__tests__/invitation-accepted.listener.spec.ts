import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { type InvitationEventPayloadInterface } from '../../../domain/events/interfaces/invitation-event-payload.interface.js';
import { InvitationAcceptedEvent } from '../../../domain/events/invitation-accepted.event.js';
import { type InvitationNotificationPort } from '../../../domain/ports/invitation-notification.port.js';
import { InvitationAcceptedListener } from '../invitation-accepted.listener.js';

describe(InvitationAcceptedListener.name, () => {
  let listener: InvitationAcceptedListener;
  let notificationPort: DeepMockProxy<InvitationNotificationPort>;

  beforeEach(() => {
    notificationPort = mockDeep<InvitationNotificationPort>();
    listener = new InvitationAcceptedListener(notificationPort);
  });

  it('should call notificationPort.sendAccepted with the invitation from the event', async () => {
    const eventContext = createTestEventContext({}, {});

    const invitation: InvitationEventPayloadInterface = {
      id: 'inv-1',
      code: 'code-1',
      category: 'user',
      userId: 'user-1',
      constraints: undefined,
      dateAccepted: new Date(),
      dateRevoked: null,
      version: 1,
      dateCreated: new Date(),
      dateUpdated: new Date(),
      dateDeleted: null,
    };

    const event = new InvitationAcceptedEvent(eventContext, invitation);

    await listener.handle(event);

    expect(notificationPort.sendAccepted).toHaveBeenCalledTimes(1);
    expect(notificationPort.sendAccepted).toHaveBeenCalledWith(
      expect.anything(),
      invitation,
    );
  });
});
