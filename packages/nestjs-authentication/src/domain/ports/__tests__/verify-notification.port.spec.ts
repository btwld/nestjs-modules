import { mock } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { Command, type CommandBus, type EventBus } from '@nestjs/cqrs';

import { NotificationSendFailedEvent } from '../../events/notification-send-failed.event.js';
import { AuthenticationEmailException } from '../../exceptions/authentication-email.exception.js';
import {
  type SendVerifyNotificationCommandInterface,
  VerifyNotificationPort,
  type VerifyNotificationPortSettings,
} from '../verify-notification.port.js';

class MockSendVerifyNotificationCommand
  extends Command<void>
  implements SendVerifyNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
    public readonly passcode: string,
    public readonly tokenExp: Date,
  ) {
    super();
  }
}

const ctx = { requestId: 'req-1' };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe(VerifyNotificationPort.name, () => {
  let port: VerifyNotificationPort;
  let commandBus: CommandBus;
  let eventBus: EventBus;

  const portSettings: VerifyNotificationPortSettings = {
    sendVerifyNotificationCommand: MockSendVerifyNotificationCommand,
  };

  beforeEach(() => {
    commandBus = mock<CommandBus>();
    eventBus = mock<EventBus>();
    port = new VerifyNotificationPort(portSettings, commandBus, eventBus);
  });

  describe('sendVerify', () => {
    it('should dispatch command via commandBus', () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      port.sendVerify(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockSendVerifyNotificationCommand),
      );
    });

    it('should not publish when the command succeeds', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      port.sendVerify(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      await flush();

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should not leave an unhandled rejection when the command fails', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockRejectedValue(
        new Error('send failed'),
      );

      port.sendVerify(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      await expect(flush()).resolves.toBeUndefined();
    });

    it('should publish a NotificationSendFailedEvent when the command fails', async () => {
      void commandBus.execute;
      const error = new Error('send failed');
      vi.spyOn(commandBus, 'execute').mockRejectedValue(error);

      port.sendVerify(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      await flush();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const published = vi.mocked(eventBus.publish).mock
        .calls[0][0] as NotificationSendFailedEvent;
      expect(published).toBeInstanceOf(NotificationSendFailedEvent);
      expect(published.ctx).toBe(ctx);
      expect(published.email).toBe('me@mail.com');
      expect(published.command).toBe(MockSendVerifyNotificationCommand);
      expect(published.error).toBeInstanceOf(AuthenticationEmailException);
      expect(published.error.context.originalError).toBe(error);
    });

    it('should not leave an unhandled rejection when eventBus.publish rejects', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockRejectedValue(
        new Error('send failed'),
      );
      vi.mocked(eventBus.publish).mockRejectedValue(
        new Error('publish also failed'),
      );

      port.sendVerify(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      await expect(flush()).resolves.toBeUndefined();
    });

    it('should not leave an unhandled rejection when eventBus.publish throws synchronously', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockRejectedValue(
        new Error('send failed'),
      );
      vi.mocked(eventBus.publish).mockImplementation(() => {
        throw new Error('publish threw synchronously');
      });

      port.sendVerify(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      await expect(flush()).resolves.toBeUndefined();
    });
  });
});
