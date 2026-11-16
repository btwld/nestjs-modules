import { type z } from 'zod';

/**
 * Compile-time assertion that a Zod schema's inferred output conforms to
 * (is assignable to) a domain interface, replacing the old
 * `class Dto implements Interface` guarantee. Extra fields on the schema
 * are allowed; missing fields, wrong types, or optional-vs-nullable
 * mismatches fail to compile.
 *
 * @example
 * ```ts
 * export const CacheSchema = conformsTo<CacheInterface>()(
 *   z.object({ id: z.string(), data: z.string().nullable() }),
 * );
 * ```
 */
export function conformsTo<Interface>() {
  return function <Schema extends z.ZodType<Interface>>(
    schema: Schema,
  ): Schema {
    return schema;
  };
}
