import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';
import { domainAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { type CacheInterface } from '../../domain/interfaces/cache.interface.js';

/**
 * `expiresIn` is intentionally NOT part of this (response) schema — it is
 * request-only. The persisted/response entity only ever carries the
 * computed `expirationDate`; the legacy `CacheDto` class declared `expiresIn`
 * as `@Expose()`d too, but since response data never actually has it,
 * class-transformer silently serialized it as `undefined` (dropped by
 * JSON). Zod's `.parse()` is stricter and correctly rejects a declared
 * required field that's actually absent, so `expiresIn` is added only on
 * the request schemas (`cacheCreateSchema`/`cacheUpdateSchema`) where
 * clients genuinely send it.
 */
export const cacheSchema = withNamedComponent(
  conformsTo<CacheInterface>()(
    domainAggregateSchema.extend({
      key: z.string().meta({ description: 'key' }),
      type: z.string().meta({ description: 'type' }),
      data: z.string().nullable().meta({ description: 'data' }),
      assigneeId: z.string().min(1).meta({ description: 'assignee id' }),
      expirationDate: z
        .date()
        .nullable()
        .meta({ description: 'Expiration date of the cache entry' }),
    }),
  ),
  'Cache',
);
