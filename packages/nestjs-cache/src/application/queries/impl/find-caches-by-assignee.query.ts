import { type PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';

import { type Cache } from '../../../domain/aggregates/cache.js';

export class FindCachesByAssigneeQuery extends Query<Cache[]> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly assigneeId: string,
  ) {
    super();
  }
}
