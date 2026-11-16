import { type z } from 'zod';

import { isObject } from '@concepta/nestjs-core';

const EMPTY_BODY_MESSAGE = 'Body must not be empty.';

/**
 * Wrap a body schema so validation also rejects an empty (`{}`) object,
 * unless `allowEmptyBody` opts out (default `true`). A schema is the
 * contract: one whose fields are all optional already declares `{}` a
 * valid body (see #466 — server-populated resources legitimately post
 * `{}`), so this only adds a check for the operations that want to reject
 * that on purpose. Runs after the base schema's own parsing, so a schema
 * with `.default()` fields — which always materializes those keys — is
 * never considered empty regardless of this flag.
 */
export function withEmptyBodyGuard<T extends z.ZodType>(
  schema: T,
  allowEmptyBody = true,
): z.ZodType {
  if (allowEmptyBody) return schema;

  return schema.refine(
    (value: unknown) => !isObject(value) || Object.keys(value).length > 0,
    { message: EMPTY_BODY_MESSAGE },
  );
}
