import { type ModuleRef } from '@nestjs/core';

import { type HookWithSpec } from '@concepta/nestjs-core';

import { RepoHook } from './repository-hook.decorators.js';

/**
 * What these checks read off a repository. Narrower than the adapter itself so
 * the dependency is explicit and a stub needs no cast.
 */
export interface HookBootTargetInterface {
  readonly entityKey: string;
  readonly boundHooks: readonly HookWithSpec[];
}

/**
 * Check that every bound hook can actually run.
 *
 * All three failures are otherwise silent: a hook missing its class-level
 * decorator, or carrying another subsystem's, is filtered out when hooks are
 * selected by type, and an unresolvable one throws on the first call that
 * needs it rather than at startup.
 */
export function checkHooksUsable(
  adapters: HookBootTargetInterface[],
  moduleRef: ModuleRef,
): string[] {
  return adapters.flatMap((adapter) =>
    adapter.boundHooks.flatMap(({ hook, type }) => {
      if (type === undefined) {
        return [
          `Hook "${hook.name}" registered for "${adapter.entityKey}" is ` +
            'missing its class-level @RepoHook() decorator, so none of its ' +
            'methods would ever run.',
        ];
      }

      if (type !== RepoHook.KEY) {
        return [
          `Hook "${hook.name}" registered for "${adapter.entityKey}" is ` +
            `decorated for the "${type}" subsystem, not repository hooks, ` +
            'so none of its methods would ever run.',
        ];
      }

      try {
        moduleRef.get(hook, { strict: false });
      } catch {
        // Both causes are named because a request-scoped hook *is* in
        // `providers` and still fails here, so a bare "add it to providers"
        // would send the reader looking for something already there.
        return [
          `Hook "${hook.name}" registered for "${adapter.entityKey}" cannot ` +
            "be resolved. Either add it to some module's providers, or, if it " +
            'is already there, make it singleton-scoped — repository hooks ' +
            'are resolved per call outside any request.',
        ];
      }

      return [];
    }),
  );
}
