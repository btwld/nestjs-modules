import { Inject, Optional, PlainLiteralObject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  AUTHENTICATION_JWT_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../../../authentication.constants.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { UserPort } from '../../../domain/ports/user.port.js';
import { AuthenticationAccessTokenException } from '../../exceptions/authentication-access-token.exception.js';
import { ValidateAndVerifyAccessTokenQuery } from '../impl/validate-and-verify-access-token.query.js';

@QueryHandler(ValidateAndVerifyAccessTokenQuery)
export class ValidateAndVerifyAccessTokenHandler implements IQueryHandler<
  ValidateAndVerifyAccessTokenQuery,
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
    query: ValidateAndVerifyAccessTokenQuery,
  ): Promise<PlainLiteralObject> {
    const { ctx, token } = query;

    const payload = await this.jwtPort.verifyAccessToken(ctx, token);

    if (this.userPort) {
      const { sub } = payload;
      const user = await this.userPort.getBySubject(ctx, sub);
      if (!user) {
        throw new AuthenticationAccessTokenException();
      }
    }

    return payload;
  }
}
