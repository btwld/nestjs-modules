import { type PlainLiteralObject } from '@nestjs/common';

import { type SpecificationInterface } from '../interfaces/specification.interface.js';

/**
 * Abstract base class for specifications.
 *
 * Implements the Specification pattern from Domain-Driven Design,
 * allowing business rules to be encapsulated as reusable, composable objects.
 *
 * Use the Spec factory for composition:
 * - Spec.and(spec1, spec2)
 * - Spec.or(spec1, spec2)
 * - Spec.not(spec)
 *
 * @example
 * ```typescript
 * class IsActiveSpec extends CompositeSpecification<User> {
 *   isSatisfiedBy(user: User): boolean {
 *     return user.active === true;
 *   }
 * }
 *
 * class IsAdminSpec extends CompositeSpecification<User> {
 *   isSatisfiedBy(user: User): boolean {
 *     return user.role === 'admin';
 *   }
 * }
 *
 * // Compose specifications using the Spec factory
 * const activeAdmin = Spec.and(new IsActiveSpec(), new IsAdminSpec());
 * const activeOrAdmin = Spec.or(new IsActiveSpec(), new IsAdminSpec());
 * const notActive = Spec.not(new IsActiveSpec());
 * ```
 */
export abstract class CompositeSpecification<
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> implements SpecificationInterface<Ctx> {
  /**
   * Check if the context satisfies this specification.
   * Must be implemented by subclasses.
   *
   * @param context - The context to check
   * @returns true if satisfied, false otherwise
   */
  abstract isSatisfiedBy(context: Ctx): boolean;
}
