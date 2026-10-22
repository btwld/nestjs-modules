import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type CacheCreatableInterface } from '../../domain/interfaces/cache-creatable.interface.js';

import { cacheSchema } from './cache.schema.js';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`), so `crud-init-api-body.decorator.ts` documents it
 * inline.
 *
 * `data` and `expiresIn` are optional here — matching the legacy
 * `CacheCreateDto` class's `IsOptional` decorator on both (picking `data`
 * from `cacheSchema`, where it's required, would lose that). `expiresIn` is
 * also request-only — see `cache.schema.ts` for why it isn't part of the
 * response schema.
 */
export const cacheCreateSchema = withOpenApi(
  conformsTo<CacheCreatableInterface>()(
    cacheSchema.pick({ key: true, type: true, assigneeId: true }).extend({
      data: z.string().nullable().optional().meta({ description: 'data' }),
      expiresIn: z
        .string()
        .nullable()
        .optional()
        .meta({
          description: 'Expiration duration expressed as a time span',
          examples: ['60', '2 days', '10h', '7d'],
        }),
    }),
  ),
);
