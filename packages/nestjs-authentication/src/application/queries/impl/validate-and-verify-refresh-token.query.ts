import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

export interface ValidateAndVerifyRefreshTokenQueryInterface {
  ctx: PlainLiteralObject;
  token: string;
}

export class ValidateAndVerifyRefreshTokenQuery
  extends Query<PlainLiteralObject>
  implements ValidateAndVerifyRefreshTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: string,
  ) {
    super();
  }
}
