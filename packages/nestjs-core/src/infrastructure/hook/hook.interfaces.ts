import { type PlainLiteralObject } from '@nestjs/common';

import { type HookMethodKeyType } from './decorators/hook-method.decorator.js';
import { type SpecificationInterface } from './interfaces/specification.interface.js';

/**
 * Hook type decorator with KEY property for subsystem filtering.
 */
export interface HookTypeInterface {
  readonly KEY: string;
}

/**
 * Metadata stored on hook classes via `@Hook` decorator.
 */
export interface HookMetadataInterface {
  type: string;
}

/**
 * Metadata stored for each hook method decorator on a method.
 */
export interface HookMethodMetadataInterface {
  key: HookMethodKeyType;
  spec?: SpecificationInterface;
  /**
   * Opaque, subsystem-defined options carried alongside the spec. Core never
   * interprets this — it's populated verbatim from whatever the subsystem's
   * decorator was called with (e.g. `@BeforeCreate({ replace: true })` in
   * `@concepta/nestjs-repository`), and read back via a `HookMethodFilter`.
   */
  options?: PlainLiteralObject;
}

/**
 * Predicate over a hook method's metadata, used by `HookResolverService.execute`
 * to select which registered methods run for a given call — e.g. to split a
 * single method key into disjoint groups based on subsystem-defined `options`.
 */
export type HookMethodFilter = (
  metadata: HookMethodMetadataInterface,
) => boolean;

/**
 * Cached method mapping for a hook.
 * Pre-computed at decoration time for O(1) runtime lookup.
 */
export interface HookMethodMapInterface {
  methodName: string;
  metadata: HookMethodMetadataInterface;
  /**
   * Pre-resolved specification for this method.
   * Computed at decoration time following priority:
   * 1. Hook decorator param: `@BeforeFind(spec)`
   * 2. Method-level: `@Specification()` on the method
   * 3. Class-level: `@Specification()` on the class
   * 4. Default: Spec.always()
   */
  resolvedSpec: SpecificationInterface;
  /**
   * Pre-resolved method function from prototype.
   * Stored at decoration time to avoid runtime property lookup.
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  method: Function;
}

/**
 * A resolved hook instance with pre-computed method mappings.
 * The spec here is from the hook config; per-method specs are in HookMethodMapInterface.
 */
export interface ResolvedHook {
  hook: object;
  spec?: SpecificationInterface;
  methods?: Map<HookMethodKeyType, HookMethodMapInterface[]>;
}

/**
 * Options for the `@Hook` decorator.
 */
export interface HookDecoratorOptions {
  type: string | { KEY: string };
  spec?: SpecificationInterface;
}
