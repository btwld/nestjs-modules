import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type Cache } from '../../../domain/aggregates/cache.js';
import { type CacheUpdatableInterface } from '../../../domain/interfaces/cache-updatable.interface.js';

export class UpdateCacheCommand extends Command<Cache> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly id: ReferenceId,
    public readonly dto: CacheUpdatableInterface,
  ) {
    super();
  }
}
