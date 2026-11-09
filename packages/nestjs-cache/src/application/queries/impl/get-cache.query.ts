import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type Cache } from '../../../domain/aggregates/cache.js';

export class GetCacheQuery extends Query<Cache> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly id: ReferenceId,
  ) {
    super();
  }
}
