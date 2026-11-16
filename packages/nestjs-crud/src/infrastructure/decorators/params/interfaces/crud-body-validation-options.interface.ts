import { type StandardSchemaValidationPipeOptions } from '@nestjs/common';

/**
 * `@CrudBody()`'s own `validation` type — a superset of Nest's
 * `StandardSchemaValidationPipeOptions`, decoupled from
 * `CrudOptionsInterface.validation`/`@CrudValidate()` so crud-specific
 * concerns like `allowEmpty` don't leak into that shared, pipe-forwarded
 * type.
 */
export interface CrudBodyValidationOptionsInterface extends StandardSchemaValidationPipeOptions {
  /**
   * Whether an empty (`{}`) body is accepted, when the body's schema
   * validates it. Default `true` — the schema is the contract, so if
   * every field is optional, `{}` is already a valid body (see #466:
   * resources whose columns are all server-populated legitimately post
   * `{}`). Set `false` to reject `{}` even though the schema would
   * otherwise allow it. Consumed by `CrudInitValidation` itself — not
   * forwarded to `StandardSchemaValidationPipe`.
   */
  allowEmpty?: boolean;
}
