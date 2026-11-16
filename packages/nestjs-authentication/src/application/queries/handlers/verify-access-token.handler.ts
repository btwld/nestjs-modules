import { Inject, PlainLiteralObject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AUTHENTICATION_JWT_PORT_TOKEN } from '../../../authentication.constants.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { VerifyAccessTokenQuery } from '../impl/verify-access-token.query.js';

@QueryHandler(VerifyAccessTokenQuery)
export class VerifyAccessTokenHandler implements IQueryHandler<
  VerifyAccessTokenQuery,
  PlainLiteralObject
> {
  constructor(
    @Inject(AUTHENTICATION_JWT_PORT_TOKEN)
    private readonly jwtPort: JwtPort,
  ) {}

  async execute(query: VerifyAccessTokenQuery): Promise<PlainLiteralObject> {
    const { ctx, token } = query;
    return this.jwtPort.verifyAccessToken(ctx, token);
  }
}
