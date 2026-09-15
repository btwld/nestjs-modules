import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ValidateTokenQueryInterface } from '../../../domain/ports/token.port.js';

export class ValidateTokenQuery
  extends Query<boolean>
  implements ValidateTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly payload: PlainLiteralObject,
  ) {
    super();
  }
}
