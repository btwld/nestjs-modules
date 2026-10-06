import { z } from 'zod';

/**
 * Zod counterpart of the now-deleted `CrudCreateBatchDto<T>` class, used by
 * every schema-based (migrated) CRUD package. `bulk.min(1)` mirrors the
 * legacy `@ArrayNotEmpty()` decorator.
 *
 * Callers wrap the result with `withOpenApi`, e.g.
 * `withOpenApi(createBatchSchema(roleCreateSchema))`.
 */
export function createBatchSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    bulk: z.array(itemSchema).min(1),
  });
}
