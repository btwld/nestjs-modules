import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type JwtVerifyTokenQueryInterface } from '../../../domain/ports/jwt.port.js';

export class JwtVerifyAccessTokenQuery
  extends Query<PlainLiteralObject>
  implements JwtVerifyTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: string,
  ) {
    super();
  }
}
