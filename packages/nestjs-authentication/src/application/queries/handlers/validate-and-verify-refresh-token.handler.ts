import { Inject, Optional, PlainLiteralObject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  AUTHENTICATION_JWT_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../../../authentication.constants.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { UserPort } from '../../../domain/ports/user.port.js';
import { AuthenticationRefreshTokenException } from '../../exceptions/authentication-refresh-token.exception.js';
import { ValidateAndVerifyRefreshTokenQuery } from '../impl/validate-and-verify-refresh-token.query.js';

@QueryHandler(ValidateAndVerifyRefreshTokenQuery)
export class ValidateAndVerifyRefreshTokenHandler implements IQueryHandler<
  ValidateAndVerifyRefreshTokenQuery,
  PlainLiteralObject
> {
  constructor(
    @Inject(AUTHENTICATION_JWT_PORT_TOKEN)
    private readonly jwtPort: JwtPort,
    @Optional()
    @Inject(AUTHENTICATION_USER_PORT_TOKEN)
    private readonly userPort: UserPort | null,
  ) {}

  async execute(
    query: ValidateAndVerifyRefreshTokenQuery,
  ): Promise<PlainLiteralObject> {
    const { ctx, token } = query;

    const payload = await this.jwtPort.verifyRefreshToken(ctx, token);

    if (this.userPort) {
      const { sub } = payload;
      const user = await this.userPort.getBySubject(ctx, sub);
      if (!user) {
        throw new AuthenticationRefreshTokenException();
      }
    }

    return payload;
  }
}
