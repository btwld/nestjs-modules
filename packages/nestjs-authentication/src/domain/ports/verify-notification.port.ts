import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { Command, CommandBus, EventBus } from '@nestjs/cqrs';

import { ReferenceEmail } from '@concepta/nestjs-core';

import { NotificationSendFailedEvent } from '../events/notification-send-failed.event.js';
import { AuthenticationEmailException } from '../exceptions/authentication-email.exception.js';

export interface SendVerifyNotificationCommandInterface extends Command<void> {
  ctx: PlainLiteralObject;
  email: ReferenceEmail;
  passcode: string;
  tokenExp: Date;
}

export interface VerifyNotificationPortSettings {
  sendVerifyNotificationCommand: Type<SendVerifyNotificationCommandInterface>;
}

@Injectable()
export class VerifyNotificationPort {
  constructor(
    private readonly portSettings: VerifyNotificationPortSettings,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  sendVerify(
    ctx: PlainLiteralObject,
    email: ReferenceEmail,
    params: { passcode: string; tokenExp: Date },
  ): void {
    const command = this.portSettings.sendVerifyNotificationCommand;
    void this.commandBus
      .execute(new command(ctx, email, params.passcode, params.tokenExp))
      .catch((error: unknown) =>
        this.notifyFailure(ctx, email, command, error),
      );
  }

  /**
   * Reports a send failure via `EventBus` instead of swallowing it, while
   * staying fire-and-forget: nothing here is allowed to produce a rejected
   * promise with no handler. `eventBus.publish()` normally returns
   * synchronously (the default in-memory publisher), but `IEventPublisher`
   * permits a Promise — and a custom publisher (Kafka, an outbox) could both
   * throw synchronously and reject — so this is wrapped in `try`/`catch`,
   * and also terminates any returned promise with its own `.catch()`.
   */
  private notifyFailure(
    ctx: PlainLiteralObject,
    email: ReferenceEmail,
    command: Type<SendVerifyNotificationCommandInterface>,
    error: unknown,
  ): Promise<void> {
    try {
      const event = new NotificationSendFailedEvent(
        ctx,
        email,
        command,
        new AuthenticationEmailException({ originalError: error }),
      );
      return Promise.resolve(this.eventBus.publish(event)).catch(
        () => undefined,
      );
    } catch {
      return Promise.resolve(undefined);
    }
  }
}
