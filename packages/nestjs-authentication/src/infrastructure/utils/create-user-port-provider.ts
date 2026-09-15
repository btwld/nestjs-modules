import { type Provider } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { AUTHENTICATION_USER_PORT_TOKEN } from '../../authentication.constants.js';
import { UserPort } from '../../domain/ports/user.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createUserPortProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: AUTHENTICATION_USER_PORT_TOKEN,
    inject: [rawOptionsToken, QueryBus, CommandBus],
    useFactory: (
      options: AuthenticationOptionsInterface,
      queryBus: QueryBus,
      commandBus: CommandBus,
    ) =>
      options.ports?.user
        ? new UserPort(options.ports.user, queryBus, commandBus)
        : null,
  };
}
