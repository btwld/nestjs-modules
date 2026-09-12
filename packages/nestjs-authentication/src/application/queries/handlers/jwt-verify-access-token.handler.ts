import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { JwtService } from '../../../infrastructure/jwt/jwt.service.js';
import { JwtVerifyAccessTokenQuery } from '../impl/jwt-verify-access-token.query.js';

@QueryHandler(JwtVerifyAccessTokenQuery)
export class JwtVerifyAccessTokenHandler implements IQueryHandler<
  JwtVerifyAccessTokenQuery,
  object
> {
  constructor(private readonly jwtService: JwtService) {}

  async execute(query: JwtVerifyAccessTokenQuery): Promise<object> {
    return this.jwtService.verifyAccessToken(query.token);
  }
}
