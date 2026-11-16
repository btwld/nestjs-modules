import { type Provider } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTHENTICATION_PASSWORD_PORT_TOKEN } from '../../authentication.constants.js';
import { PasswordPort } from '../../domain/ports/password.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createPasswordPortProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: AUTHENTICATION_PASSWORD_PORT_TOKEN,
    inject: [rawOptionsToken, CommandBus],
    useFactory: (
      options: AuthenticationOptionsInterface,
      commandBus: CommandBus,
    ) =>
      options.ports?.password
        ? new PasswordPort(options.ports.password, commandBus)
        : null,
  };
}
