import { z } from 'zod';

/**
 * Zod equivalent of `TestModel` (`models/test.model.ts`) — a bare,
 * undecorated class kept around only as a `Type<T>` token for
 * `RepositoryInterface.metadata.type` (a genuine class-reference contract,
 * unrelated to CRUD validation/serialization — not converted). This
 * schema is the counterpart used wherever `TestModel` was previously
 * wired as `response: { resource: TestModel }`.
 *
 * `z.looseObject` (not a strict `z.object`) is required to faithfully
 * reproduce `crud-context.interceptor.e2e-spec.ts`'s explicit
 * `{ excludeExtraneousValues: false, strategy: 'exposeAll' }` legacy
 * config — those tests intentionally return non-TestModel-shaped payloads
 * (`{ query }`, `{ params }`, `{ page }`) through the same `resource`
 * type to exercise generic passthrough behavior; a strict schema would
 * strip/reject those extra keys instead of keeping them.
 */
export const testModelSchema = z.looseObject({
  id: z.number().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  age: z.number().optional(),
});
