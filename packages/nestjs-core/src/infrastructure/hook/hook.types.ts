import { type Type } from '@nestjs/common';

/**
 * Normalized hook configuration. Stored on context and in the registry.
 *
 * Gating a hook is a property of the hook, not of where it was registered:
 * pass a specification to the hook-method decorator, to a method-level
 * `@Specification`, or to the class-level `@Hook`/`@RepoHook`.
 */
export interface HookWithSpec {
  hook: Type;
  type?: string;
}

/**
 * Configuration for a hook registration: a hook class, or that class wrapped
 * with the subsystem `type` it belongs to.
 */
export type HookOption = Type | HookWithSpec;
