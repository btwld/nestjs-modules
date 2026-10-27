import { type PlainLiteralObject } from '@nestjs/common';
import { Command, Query } from '@nestjs/cqrs';

import {
  type AssigneeRelationInterface,
  type ReferenceEmail,
} from '@concepta/nestjs-core';

import {
  type AuthenticationOtpCreatableInterface,
  type AuthenticationOtpInterface,
  type ClearOtpCommandInterface,
  type CreateOtpCommandInterface,
  type OtpCreateOptions,
  type OtpPortSettings,
  type ValidateOtpQueryInterface,
} from '../../../domain/ports/otp.port.js';
import {
  type RecoveryNotificationPortSettings,
  type SendPasswordUpdatedNotificationCommandInterface,
  type SendRecoverLoginNotificationCommandInterface,
  type SendRecoverPasswordNotificationCommandInterface,
} from '../../../domain/ports/recovery-notification.port.js';
import {
  type SendVerifyNotificationCommandInterface,
  type VerifyNotificationPortSettings,
} from '../../../domain/ports/verify-notification.port.js';

/**
 * `AuthenticationPortsInterface` requires `otp`, `recoveryNotification` and
 * `verifyNotification` whenever `ports` is supplied, even for fixtures that
 * only exercise jwt/local/refresh strategies. These command/query classes
 * are never dispatched by those fixtures — no handlers are registered for
 * them on purpose.
 */

class StubCreateOtpCommand
  extends Command<AuthenticationOtpInterface>
  implements CreateOtpCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public namespace: string,
    public otp: AuthenticationOtpCreatableInterface,
    public options?: OtpCreateOptions,
  ) {
    super();
  }
}

class StubValidateOtpQuery
  extends Query<AssigneeRelationInterface | null>
  implements ValidateOtpQueryInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public namespace: string,
    public otp: Pick<AuthenticationOtpInterface, 'category' | 'passcode'>,
  ) {
    super();
  }
}

class StubClearOtpCommand
  extends Command<void>
  implements ClearOtpCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public namespace: string,
    public otp: Pick<AuthenticationOtpInterface, 'category' | 'assigneeId'>,
  ) {
    super();
  }
}

export const stubOtpPortSettings: OtpPortSettings = {
  createCommand: StubCreateOtpCommand,
  validateQuery: StubValidateOtpQuery,
  clearCommand: StubClearOtpCommand,
};

class StubSendRecoverLoginNotificationCommand
  extends Command<void>
  implements SendRecoverLoginNotificationCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public email: ReferenceEmail,
    public username: string,
  ) {
    super();
  }
}

class StubSendRecoverPasswordNotificationCommand
  extends Command<void>
  implements SendRecoverPasswordNotificationCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public email: ReferenceEmail,
    public passcode: string,
    public tokenExp: Date,
  ) {
    super();
  }
}

class StubSendPasswordUpdatedNotificationCommand
  extends Command<void>
  implements SendPasswordUpdatedNotificationCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public email: ReferenceEmail,
  ) {
    super();
  }
}

export const stubRecoveryNotificationPortSettings: RecoveryNotificationPortSettings =
  {
    sendRecoverLoginNotificationCommand:
      StubSendRecoverLoginNotificationCommand,
    sendRecoverPasswordNotificationCommand:
      StubSendRecoverPasswordNotificationCommand,
    sendPasswordUpdatedNotificationCommand:
      StubSendPasswordUpdatedNotificationCommand,
  };

class StubSendVerifyNotificationCommand
  extends Command<void>
  implements SendVerifyNotificationCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public email: ReferenceEmail,
    public passcode: string,
    public tokenExp: Date,
  ) {
    super();
  }
}

export const stubVerifyNotificationPortSettings: VerifyNotificationPortSettings =
  {
    sendVerifyNotificationCommand: StubSendVerifyNotificationCommand,
  };
