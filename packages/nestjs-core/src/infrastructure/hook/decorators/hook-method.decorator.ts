import { type PlainLiteralObject } from '@nestjs/common';

import { HOOK_METHOD_METADATA_KEY } from '../hook.constants.js';
import { type HookMethodMetadataInterface } from '../hook.interfaces.js';
import { type SpecificationInterface } from '../interfaces/specification.interface.js';

/**
 * Hook method key type.
 * Subsystems define their own keys (e.g., RepoHookMethodKey.BEFORE_FIND).
 */
export type HookMethodKeyType = string;

/**
 * Creates a hook method decorator for a specific hook key.
 *
 * The returned decorator can be applied to methods in a `@Hook` class.
 * When called with a specification, it overrides the class/method-level spec
 * for this specific hook.
 *
 * Multiple hook decorators can be stacked on the same method.
 *
 * @param key - The hook method key (subsystems define their own keys)
 * @returns A decorator factory that optionally accepts a specification and
 *   subsystem-defined options
 *
 * @example
 * ```typescript
 * // Subsystems define their own keys and decorators
 * export const BeforeFind = createHookMethodDecorator(RepoHookMethodKey.BEFORE_FIND);
 * export const AfterCreate = createHookMethodDecorator(RepoHookMethodKey.AFTER_CREATE);
 *
 * // Use without spec (uses class/method-level spec)
 * @BeforeFind()
 * addFilter(options) { ... }
 *
 * // Use with hook-specific spec override
 * @BeforeRemove(Spec.hasRole('admin'))
 * restrictDelete(entity) { ... }
 *
 * // Multiple hooks on same method
 * @BeforeFind()
 * @BeforeFindOne()
 * addTenantFilter(options) { ... }
 *
 * // With subsystem-defined options (opaque to core, read back via a
 * // HookMethodFilter). This is createHookMethodDecorator's own two-arg
 * // (spec, options) shape — a subsystem can wrap it to offer a friendlier
 * // single-arg form instead; see nestjs-repository's
 * // `@BeforeCreate({ replace: true })` for exactly that.
 * @MyWriteHook(undefined, { replace: true })
 * stampTenant(data) { ... }
 * ```
 */
export function createHookMethodDecorator(
  key: HookMethodKeyType,
): (
  spec?: SpecificationInterface,
  options?: PlainLiteralObject,
) => MethodDecorator {
  return (
    spec?: SpecificationInterface,
    options?: PlainLiteralObject,
  ): MethodDecorator => {
    return (
      _target: object,
      _propertyKey: string | symbol,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      const method = descriptor.value;
      if (!method) {
        return descriptor;
      }

      // Get existing metadata or initialize empty array
      const existing: HookMethodMetadataInterface[] =
        Reflect.getMetadata(HOOK_METHOD_METADATA_KEY, method) ?? [];

      // Add this hook's metadata
      const metadata: HookMethodMetadataInterface = { key, spec, options };
      Reflect.defineMetadata(
        HOOK_METHOD_METADATA_KEY,
        [...existing, metadata],
        method,
      );

      return descriptor;
    };
  };
}
