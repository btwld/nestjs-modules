import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type CacheUpdatableInterface } from '../../domain/interfaces/cache-updatable.interface.js';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`), so `crud-init-api-body.decorator.ts` documents it
 * inline.
 *
 * Both fields are optional — matching the legacy `CacheUpdateDto` class's
 * `IsOptional` decorator on both (e.g. a PATCH extending TTL without
 * resending `data`).
 * `expiresIn` is also request-only — see `cache.schema.ts` for why it
 * isn't part of the response schema.
 */
export const cacheUpdateSchema = withOpenApi(
  conformsTo<CacheUpdatableInterface>()(
    z.object({
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
