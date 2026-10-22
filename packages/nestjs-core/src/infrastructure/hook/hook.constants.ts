/**
 * Metadata key for `@UseHooks` decorator.
 */
export const HOOKS_METADATA_KEY = 'NESTJS_HOOK_HOOKS';

/**
 * Metadata key for `@Hook` class decorator.
 */
export const HOOK_METADATA_KEY = Symbol('Hook');

/**
 * Metadata key for hook method decorators.
 * Stores array of HookMethodMetadataInterface on the decorated method.
 */
export const HOOK_METHOD_METADATA_KEY = Symbol('HookMethod');

/**
 * Metadata key for pre-computed hook method mappings.
 * Set by `@Hook()` decorator at class definition time for O(1) lookup.
 */
export const HOOK_METHODS_CACHE_KEY = Symbol('HookMethodsCache');

/**
 * Metadata key for `@Specification` decorator (class and method level).
 */
export const SPECIFICATION_METADATA_KEY = Symbol('Specification');
