import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

export interface ValidateAndVerifyAccessTokenQueryInterface {
  ctx: PlainLiteralObject;
  token: string;
}

export class ValidateAndVerifyAccessTokenQuery
  extends Query<PlainLiteralObject>
  implements ValidateAndVerifyAccessTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: string,
  ) {
    super();
  }
}
