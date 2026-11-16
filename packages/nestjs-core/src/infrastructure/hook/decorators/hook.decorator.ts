import { applyDecorators, Injectable, SetMetadata } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';

import {
  HOOK_METADATA_KEY,
  HOOK_METHOD_METADATA_KEY,
  HOOK_METHODS_CACHE_KEY,
  SPECIFICATION_METADATA_KEY,
} from '../hook.constants.js';
import {
  type HookDecoratorOptions,
  type HookMethodMapInterface,
  type HookMethodMetadataInterface,
  type HookMetadataInterface,
} from '../hook.interfaces.js';
import { type SpecificationInterface } from '../interfaces/specification.interface.js';
import { Spec } from '../specification/spec.factory.js';

import { type HookMethodKeyType } from './hook-method.decorator.js';
import { Specification } from './specification.decorator.js';

const metadataScanner = new MetadataScanner();

/**
 * Resolve hook type from string or object with KEY property.
 */
function resolveHookType(type: string | { KEY: string }): string {
  if (typeof type === 'string') {
    return type;
  }
  return type.KEY;
}

/**
 * Marks a class as a hook that can be registered and executed.
 *
 * Automatically applies `@Injectable()` so the class can be resolved via DI.
 * Pre-computes method mappings at decoration time for O(1) runtime lookup.
 *
 * Hook classes should have methods decorated with hook method decorators
 * like `@BeforeFind()`, `@AfterCreate()`, etc.
 *
 * @param options - Hook options including required type and optional spec.
 *
 * @example
 * ```typescript
 * // Repository hook using decorator reference
 * @Hook({ type: RepoHook })
 * export class TenantHook {
 *   @BeforeFind()
 *   addTenantFilter(options, ctx) { ... }
 * }
 *
 * // Hook with class-level spec
 * @Hook({ type: RepoHook, spec: Spec.hasRole('admin') })
 * export class AdminHook {
 *   @AfterCreate()
 *   logAdminAction(result, ctx) { ... }
 * }
 *
 * // Using subsystem-specific decorator (recommended)
 * @RepoHook()
 * export class AuditHook {
 *   @AfterCreate()
 *   logCreation(result, ctx) { ... }
 * }
 * ```
 */
export function Hook(options: HookDecoratorOptions): ClassDecorator {
  const hookType = resolveHookType(options.type);

  const metadata: HookMetadataInterface = {
    type: hookType,
  };

  const decorators: (ClassDecorator | MethodDecorator)[] = [
    Injectable(),
    SetMetadata(HOOK_METADATA_KEY, metadata),
  ];

  if (options.spec) {
    decorators.push(Specification(options.spec));
  }

  // Apply base decorators first, then scan methods
  const baseDecorator = applyDecorators(...decorators);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    // Apply Injectable, SetMetadata, etc.
    baseDecorator(target);

    // Pre-compute method mappings at decoration time
    const methodsCache = scanHookMethods(target);
    Reflect.defineMetadata(HOOK_METHODS_CACHE_KEY, methodsCache, target);
  };
}

/**
 * Scan a hook class prototype for decorated methods.
 * Called once at decoration time (app startup).
 * Pre-computes resolved specifications for O(1) runtime lookup.
 */
function scanHookMethods(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  target: Function,
): Map<HookMethodKeyType, HookMethodMapInterface[]> {
  const methods = new Map<HookMethodKeyType, HookMethodMapInterface[]>();
  const prototype = target.prototype;
  const methodNames = metadataScanner.getAllMethodNames(prototype);

  // Get class-level spec once (from @Specification or @Hook({ spec }))
  const classSpec: SpecificationInterface | undefined = Reflect.getMetadata(
    SPECIFICATION_METADATA_KEY,
    target,
  );

  for (const methodName of methodNames) {
    const method = prototype[methodName];
    if (typeof method !== 'function') continue;

    // Get hook method metadata
    const hookMetadata: HookMethodMetadataInterface[] | undefined =
      Reflect.getMetadata(HOOK_METHOD_METADATA_KEY, method);

    if (!hookMetadata || hookMetadata.length === 0) continue;

    // Get method-level spec once per method
    const methodSpec: SpecificationInterface | undefined = Reflect.getMetadata(
      SPECIFICATION_METADATA_KEY,
      method,
    );

    // Register each hook key for this method
    for (const meta of hookMetadata) {
      // Resolve spec following priority: hook param > method > class > always
      const resolvedSpec =
        meta.spec ?? methodSpec ?? classSpec ?? Spec.always();

      const existing = methods.get(meta.key) ?? [];
      existing.push({ methodName, metadata: meta, resolvedSpec, method });
      methods.set(meta.key, existing);
    }
  }

  return methods;
}
