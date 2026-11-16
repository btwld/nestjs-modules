import { type Provider } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { SignAccessTokenCommand } from '../../application/commands/impl/sign-access-token.command.js';
import { SignRefreshTokenCommand } from '../../application/commands/impl/sign-refresh-token.command.js';
import { JwtVerifyAccessTokenQuery } from '../../application/queries/impl/jwt-verify-access-token.query.js';
import { JwtVerifyRefreshTokenQuery } from '../../application/queries/impl/jwt-verify-refresh-token.query.js';
import { AUTHENTICATION_JWT_PORT_TOKEN } from '../../authentication.constants.js';
import { JwtPort, type JwtPortSettings } from '../../domain/ports/jwt.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export const DEFAULT_JWT_PORT_SETTINGS: JwtPortSettings = {
  signAccessTokenCommand: SignAccessTokenCommand,
  signRefreshTokenCommand: SignRefreshTokenCommand,
  verifyAccessTokenQuery: JwtVerifyAccessTokenQuery,
  verifyRefreshTokenQuery: JwtVerifyRefreshTokenQuery,
};

export function createJwtPortProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: AUTHENTICATION_JWT_PORT_TOKEN,
    inject: [rawOptionsToken, CommandBus, QueryBus],
    useFactory: (
      options: AuthenticationOptionsInterface,
      commandBus: CommandBus,
      queryBus: QueryBus,
    ) =>
      new JwtPort(
        { ...DEFAULT_JWT_PORT_SETTINGS, ...options.ports?.jwt },
        commandBus,
        queryBus,
      ),
  };
}
