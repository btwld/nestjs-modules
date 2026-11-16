import { type Provider } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { AUTHENTICATION_OTP_PORT_TOKEN } from '../../authentication.constants.js';
import { OtpPort } from '../../domain/ports/otp.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createOtpPortProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: AUTHENTICATION_OTP_PORT_TOKEN,
    inject: [rawOptionsToken, CommandBus, QueryBus],
    useFactory: (
      options: AuthenticationOptionsInterface,
      commandBus: CommandBus,
      queryBus: QueryBus,
    ) =>
      options.ports?.otp
        ? new OtpPort(options.ports.otp, commandBus, queryBus)
        : null,
  };
}
