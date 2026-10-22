import { SetMetadata } from '@nestjs/common';

import { SPECIFICATION_METADATA_KEY } from '../hook.constants.js';
import { type SpecificationInterface } from '../interfaces/specification.interface.js';

/**
 * Sets a specification on a class or method.
 *
 * When applied to a class, it becomes the default specification for all methods.
 * When applied to a method, it overrides any class-level specification.
 *
 * Specifications are plain objects (not NestJS providers) instantiated once
 * at decoration time and reused for every request.
 *
 * Resolution order (most specific wins):
 * 1. Hook decorator param: `@BeforeFind(spec)` - highest precedence
 * 2. Method-level: `@Specification()` on the method
 * 3. Class-level: `@Specification()` on the class (or via `@Hook(spec)`)
 * 4. Default: `Spec.always()`
 *
 * @param spec - The specification instance that determines when the hook applies
 *
 * @example
 * ```typescript
 * // Class-level spec (applies to all methods)
 * @Hook()
 * @Specification(Spec.hasRole('admin'))
 * class AdminHook {
 *   @AfterCreate()
 *   logAction() { ... }  // Uses Spec.hasRole('admin')
 * }
 *
 * // Method-level override
 * @Hook()
 * @Specification(Spec.always())
 * class MixedHook {
 *   @BeforeFind()
 *   findHook() { ... }  // Uses Spec.always()
 *
 *   @BeforeRemove()
 *   @Specification(Spec.hasRole('admin'))  // Override for this method
 *   removeHook() { ... }  // Uses Spec.hasRole('admin')
 * }
 * ```
 */
export function Specification(
  spec: SpecificationInterface,
): ClassDecorator & MethodDecorator {
  return SetMetadata(SPECIFICATION_METADATA_KEY, spec);
}
