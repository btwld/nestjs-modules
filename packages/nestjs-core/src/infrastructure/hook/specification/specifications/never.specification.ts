import { type PlainLiteralObject } from '@nestjs/common';

import { CompositeSpecification } from '../composite-specification.js';

/**
 * Specification that always returns false.
 * Use when you want to temporarily disable a hook.
 *
 * @example
 * ```typescript
 * // Hook never applies
 * Spec.never()
 *
 * // Useful for debugging or conditional disabling
 * const spec = isDebug ? Spec.never() : Spec.always();
 * ```
 */
export class NeverSpecification<
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> extends CompositeSpecification<Ctx> {
  isSatisfiedBy(): boolean {
    return false;
  }
}
