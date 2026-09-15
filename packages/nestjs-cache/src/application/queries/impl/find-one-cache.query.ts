import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type Cache } from '../../../domain/aggregates/cache.js';

export class FindOneCacheQuery extends Query<Cache | null> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly key: string,
    public readonly type: string,
    public readonly assigneeId: string,
  ) {
    super();
  }
}
