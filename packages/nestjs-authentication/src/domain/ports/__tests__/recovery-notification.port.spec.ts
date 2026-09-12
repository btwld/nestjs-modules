import { mock } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { Command, type CommandBus, type EventBus } from '@nestjs/cqrs';

import { NotificationSendFailedEvent } from '../../events/notification-send-failed.event.js';
import { AuthenticationEmailException } from '../../exceptions/authentication-email.exception.js';
import {
  RecoveryNotificationPort,
  type RecoveryNotificationPortSettings,
  type SendPasswordUpdatedNotificationCommandInterface,
  type SendRecoverLoginNotificationCommandInterface,
  type SendRecoverPasswordNotificationCommandInterface,
} from '../recovery-notification.port.js';

class MockSendRecoverLoginCommand
  extends Command<void>
  implements SendRecoverLoginNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
    public readonly username: string,
  ) {
    super();
  }
}

class MockSendRecoverPasswordCommand
  extends Command<void>
  implements SendRecoverPasswordNotificationCommandInterface
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

class MockSendPasswordUpdatedCommand
  extends Command<void>
  implements SendPasswordUpdatedNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
  ) {
    super();
  }
}

const ctx = { requestId: 'req-1' };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe(RecoveryNotificationPort.name, () => {
  let port: RecoveryNotificationPort;
  let commandBus: CommandBus;
  let eventBus: EventBus;

  const portSettings: RecoveryNotificationPortSettings = {
    sendRecoverLoginNotificationCommand: MockSendRecoverLoginCommand,
    sendRecoverPasswordNotificationCommand: MockSendRecoverPasswordCommand,
    sendPasswordUpdatedNotificationCommand: MockSendPasswordUpdatedCommand,
  };

  beforeEach(() => {
    commandBus = mock<CommandBus>();
    eventBus = mock<EventBus>();
    port = new RecoveryNotificationPort(portSettings, commandBus, eventBus);
  });

  describe('sendRecoverLogin', () => {
    it('should dispatch command via commandBus', () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      port.sendRecoverLogin(ctx, 'me@mail.com', 'username');

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockSendRecoverLoginCommand),
      );
    });

    it('should not publish when the command succeeds', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      port.sendRecoverLogin(ctx, 'me@mail.com', 'username');

      await flush();

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should not leave an unhandled rejection when the command fails', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockRejectedValue(
        new Error('send failed'),
      );

      port.sendRecoverLogin(ctx, 'me@mail.com', 'username');

      await expect(flush()).resolves.toBeUndefined();
    });

    it('should publish a NotificationSendFailedEvent when the command fails', async () => {
      void commandBus.execute;
      const error = new Error('send failed');
      vi.spyOn(commandBus, 'execute').mockRejectedValue(error);

      port.sendRecoverLogin(ctx, 'me@mail.com', 'username');

      await flush();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const published = vi.mocked(eventBus.publish).mock
        .calls[0][0] as NotificationSendFailedEvent;
      expect(published).toBeInstanceOf(NotificationSendFailedEvent);
      expect(published.ctx).toBe(ctx);
      expect(published.email).toBe('me@mail.com');
      expect(published.command).toBe(MockSendRecoverLoginCommand);
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

      port.sendRecoverLogin(ctx, 'me@mail.com', 'username');

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

      port.sendRecoverLogin(ctx, 'me@mail.com', 'username');

      await expect(flush()).resolves.toBeUndefined();
    });
  });

  describe('sendRecoverPassword', () => {
    it('should dispatch command via commandBus', () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      port.sendRecoverPassword(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockSendRecoverPasswordCommand),
      );
    });

    it('should not leave an unhandled rejection when the command fails', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockRejectedValue(
        new Error('send failed'),
      );

      port.sendRecoverPassword(ctx, 'me@mail.com', {
        passcode: 'abc123',
        tokenExp: new Date(),
      });

      await expect(flush()).resolves.toBeUndefined();
    });

    it('should publish a NotificationSendFailedEvent when the command fails', async () => {
      void commandBus.execute;
      const error = new Error('send failed');
      vi.spyOn(commandBus, 'execute').mockRejectedValue(error);

      port.sendRecoverPassword(ctx, 'me@mail.com', {
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
      expect(published.command).toBe(MockSendRecoverPasswordCommand);
      expect(published.error).toBeInstanceOf(AuthenticationEmailException);
      expect(published.error.context.originalError).toBe(error);
    });
  });

  describe('sendPasswordUpdated', () => {
    it('should dispatch command via commandBus', () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      port.sendPasswordUpdated(ctx, 'me@mail.com');

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockSendPasswordUpdatedCommand),
      );
    });

    it('should not leave an unhandled rejection when the command fails', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockRejectedValue(
        new Error('send failed'),
      );

      port.sendPasswordUpdated(ctx, 'me@mail.com');

      await expect(flush()).resolves.toBeUndefined();
    });

    it('should publish a NotificationSendFailedEvent when the command fails', async () => {
      void commandBus.execute;
      const error = new Error('send failed');
      vi.spyOn(commandBus, 'execute').mockRejectedValue(error);

      port.sendPasswordUpdated(ctx, 'me@mail.com');

      await flush();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const published = vi.mocked(eventBus.publish).mock
        .calls[0][0] as NotificationSendFailedEvent;
      expect(published).toBeInstanceOf(NotificationSendFailedEvent);
      expect(published.ctx).toBe(ctx);
      expect(published.email).toBe('me@mail.com');
      expect(published.command).toBe(MockSendPasswordUpdatedCommand);
      expect(published.error).toBeInstanceOf(AuthenticationEmailException);
      expect(published.error.context.originalError).toBe(error);
    });
  });
});
