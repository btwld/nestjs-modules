import { type PlainLiteralObject } from '@nestjs/common';

import { type HookWithSpec } from '../../hook/hook.types.js';

/**
 * Context interface for hooks.
 *
 * Contains the hooks array gathered from `@UseHooks()` decorators for the
 * current request. Hooks a subsystem registers against a target of its own
 * are held there, not here.
 */
export interface HookContextInterface extends PlainLiteralObject {
  /**
   * Normalized hook configurations to apply for this operation.
   */
  hooks: HookWithSpec[];
}
