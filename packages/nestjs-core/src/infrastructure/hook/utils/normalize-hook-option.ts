import { type Type } from '@nestjs/common';

import { HOOK_METADATA_KEY } from '../hook.constants.js';
import { type HookMetadataInterface } from '../hook.interfaces.js';
import { type HookOption, type HookWithSpec } from '../hook.types.js';

/**
 * Normalize a hook registration to its stored form, filling in the subsystem
 * `type` from the class-level `@Hook()` metadata.
 *
 * Reads the metadata directly rather than through Nest's `Reflector`, because
 * the registration paths include a static `forFeature()` with no injector to
 * resolve one from.
 *
 * An undecorated class yields `type: undefined`, which no subsystem matches —
 * callers that can fail at startup should reject it there rather than let the
 * hook silently never run.
 *
 * @param option - A hook class, or that class wrapped with its subsystem type
 * @returns The normalized registration
 */
export function normalizeHookOption(option: HookOption): HookWithSpec {
  const hook: Type = typeof option === 'function' ? option : option.hook;

  const metadata: HookMetadataInterface | undefined = Reflect.getMetadata(
    HOOK_METADATA_KEY,
    hook,
  );

  return { hook, type: metadata?.type };
}
