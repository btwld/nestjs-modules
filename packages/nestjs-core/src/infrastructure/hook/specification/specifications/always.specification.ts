import { type PlainLiteralObject } from '@nestjs/common';

import { CompositeSpecification } from '../composite-specification.js';

/**
 * Specification that always returns true.
 * Use when a hook should always apply regardless of context.
 *
 * @example
 * ```typescript
 * // Hook always applies
 * Spec.always()
 *
 * // Equivalent to not providing a specification at all
 * ```
 */
export class AlwaysSpecification<
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> extends CompositeSpecification<Ctx> {
  isSatisfiedBy(): boolean {
    return true;
  }
}
