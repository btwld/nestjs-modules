import { z } from 'zod';

/**
 * Schema equivalent of `CrudResponsePaginatedDto<T>` — the Zod counterpart
 * used by schema-based (migrated) CRUD packages. `metrics` is intentionally
 * omitted, matching the legacy DTO (which never `@Expose()`s it either).
 *
 * Callers wrap the result with `withNamedComponent` to register it as its
 * own OpenAPI component, e.g.
 * `withNamedComponent(paginatedSchema(cacheSchema), 'CachePaginated')`.
 */
export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    limit: z.number(),
    count: z.number(),
    total: z.number(),
    page: z.number(),
    pageCount: z.number(),
  });
}
