import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type VerifyTokenQueryInterface } from '../../../domain/ports/token.port.js';

export class VerifyAccessTokenQuery
  extends Query<PlainLiteralObject>
  implements VerifyTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: string,
  ) {
    super();
  }
}
