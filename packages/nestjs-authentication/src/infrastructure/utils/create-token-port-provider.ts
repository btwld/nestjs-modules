import { type Provider } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { IssueAccessTokenCommand } from '../../application/commands/impl/issue-access-token.command.js';
import { IssueRefreshTokenCommand } from '../../application/commands/impl/issue-refresh-token.command.js';
import { ValidateTokenQuery } from '../../application/queries/impl/validate-token.query.js';
import { VerifyAccessTokenQuery } from '../../application/queries/impl/verify-access-token.query.js';
import { VerifyRefreshTokenQuery } from '../../application/queries/impl/verify-refresh-token.query.js';
import { AUTHENTICATION_TOKEN_PORT_TOKEN } from '../../authentication.constants.js';
import {
  TokenPort,
  type TokenPortSettings,
} from '../../domain/ports/token.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export const DEFAULT_TOKEN_PORT_SETTINGS: TokenPortSettings = {
  issueAccessTokenCommand: IssueAccessTokenCommand,
  issueRefreshTokenCommand: IssueRefreshTokenCommand,
  verifyAccessTokenQuery: VerifyAccessTokenQuery,
  verifyRefreshTokenQuery: VerifyRefreshTokenQuery,
  validateTokenQuery: ValidateTokenQuery,
};

export function createTokenPortProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: AUTHENTICATION_TOKEN_PORT_TOKEN,
    inject: [rawOptionsToken, CommandBus, QueryBus],
    useFactory: (
      options: AuthenticationOptionsInterface,
      commandBus: CommandBus,
      queryBus: QueryBus,
    ) =>
      new TokenPort(
        { ...DEFAULT_TOKEN_PORT_SETTINGS, ...options.ports?.token },
        commandBus,
        queryBus,
      ),
  };
}
