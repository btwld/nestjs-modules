import { type PlainLiteralObject } from '@nestjs/common';

/**
 * Specification pattern interface.
 * Determines if a context satisfies certain criteria.
 */
export interface SpecificationInterface<
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> {
  /**
   * Check if the context satisfies this specification.
   *
   * @param context - The context to check
   * @returns true if satisfied, false otherwise
   */
  isSatisfiedBy(context: Ctx): boolean;
}
