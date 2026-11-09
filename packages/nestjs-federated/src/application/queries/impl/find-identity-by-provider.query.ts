import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type Identity } from '../../../domain/aggregates/identity.js';

export class FindIdentityByProviderQuery extends Query<Identity | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly provider: string,
    public readonly subject: string,
  ) {
    super();
  }
}
