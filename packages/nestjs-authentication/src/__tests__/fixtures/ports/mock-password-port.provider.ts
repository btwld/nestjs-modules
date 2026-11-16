import { PlainLiteralObject, Provider } from '@nestjs/common';
import {
  Command,
  CommandBus,
  CommandHandler,
  ICommandHandler,
} from '@nestjs/cqrs';

import { ReferenceId, ReferenceIdInterface } from '@concepta/nestjs-core';

import { AUTHENTICATION_PASSWORD_PORT_TOKEN } from '../../../authentication.constants.js';
import {
  PasswordPort,
  PasswordPortSettings,
  SetPasswordCommandInterface,
  ValidatePasswordCommandInterface,
} from '../../../domain/ports/password.port.js';

// ── Mock commands ──

export class MockValidatePasswordCommand
  extends Command<boolean>
  implements ValidatePasswordCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public password: string,
    public target: ReferenceIdInterface,
  ) {
    super();
  }
}

export class MockSetPasswordCommand
  extends Command<void>
  implements SetPasswordCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public password: string,
    public assigneeId: ReferenceId,
  ) {
    super();
  }
}

// ── Mock handlers ──

@CommandHandler(MockValidatePasswordCommand)
export class MockValidatePasswordHandler implements ICommandHandler<MockValidatePasswordCommand> {
  async execute(_command: MockValidatePasswordCommand): Promise<boolean> {
    return true;
  }
}

@CommandHandler(MockSetPasswordCommand)
export class MockSetPasswordHandler implements ICommandHandler<MockSetPasswordCommand> {
  async execute(_command: MockSetPasswordCommand): Promise<void> {
    return;
  }
}

// ── Port settings ──

export const mockPasswordPortSettings: PasswordPortSettings = {
  validateCommand: MockValidatePasswordCommand,
  setPasswordCommand: MockSetPasswordCommand,
};

// ── Reusable mock handlers array ──

export const mockPasswordPortHandlers = [
  MockValidatePasswordHandler,
  MockSetPasswordHandler,
];

// ── Provider factory ──

export function createMockPasswordPortProvider(
  settings: PasswordPortSettings = mockPasswordPortSettings,
): Provider {
  return {
    provide: AUTHENTICATION_PASSWORD_PORT_TOKEN,
    inject: [CommandBus],
    useFactory: (commandBus: CommandBus) =>
      new PasswordPort(settings, commandBus),
  };
}
