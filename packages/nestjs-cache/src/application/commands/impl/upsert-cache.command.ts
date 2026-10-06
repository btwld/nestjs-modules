import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type Cache } from '../../../domain/aggregates/cache.js';
import { type CacheCreatableInterface } from '../../../domain/interfaces/cache-creatable.interface.js';

export class UpsertCacheCommand extends Command<Cache> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly dto: CacheCreatableInterface,
  ) {
    super();
  }
}
