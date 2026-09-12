import { Injectable, PlainLiteralObject } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import { HookMethodKeyType } from './decorators/hook-method.decorator.js';
import { HookNotDecoratedException } from './exceptions/hook-not-decorated.exception.js';
import { HookProviderNotFoundException } from './exceptions/hook-provider-not-found.exception.js';
import { HOOK_METHODS_CACHE_KEY } from './hook.constants.js';
import {
  HookMethodFilter,
  HookMethodMapInterface,
  ResolvedHook,
} from './hook.interfaces.js';
import { HookWithSpec } from './hook.types.js';
import { SpecificationInterface } from './interfaces/specification.interface.js';

/**
 * Service for resolving hook configurations to instances
 * and executing hook methods.
 *
 * Specifications are pre-computed at decoration time by `@Hook()`.
 * This service evaluates those specs against the context at runtime.
 *
 * This service is stateless - hook configs and context are passed
 * to each method call.
 *
 * Consuming modules (like nestjs-repository) use this service
 * to resolve hooks and call the appropriate methods.
 */
@Injectable()
export class HookResolverService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Execute hooks for a specific subsystem and method key.
   *
   * Filters by hook type, resolves instances, evaluates specs,
   * and calls hook methods in sequence.
   *
   * @param hookType - Hook type decorator with KEY property
   * @param methodKey - The method key (e.g., 'beforeFind')
   * @param payload - The payload to pass through hooks
   * @param ctx - The hook context
   * @param filter - Optional predicate over each method's metadata, letting a
   *   subsystem split a single method key into disjoint execution groups (e.g.
   *   by subsystem-defined `options`). Omitted = every registered method runs,
   *   which is the existing behavior.
   * @returns The payload after processing by applicable hooks
   */
  async execute<T>(
    hookType: { readonly KEY: string },
    methodKey: HookMethodKeyType,
    payload: T,
    ctx: PlainLiteralObject | undefined,
    filter?: HookMethodFilter,
  ): Promise<T> {
    if (!ctx?.hooks?.length) {
      return payload;
    }

    // Filter hooks by type
    const typeHooks = ctx.hooks.filter(
      (config: HookWithSpec) => config.type === hookType.KEY,
    );

    if (!typeHooks.length) {
      return payload;
    }

    // Resolve filtered hooks
    const resolved = this.resolveHooks(typeHooks);
    let result = payload;

    for (const resolvedHook of resolved) {
      const methods = this.getMethods<T>(resolvedHook, methodKey, filter);

      for (const { method, spec } of methods) {
        if (!spec.isSatisfiedBy(ctx)) {
          continue;
        }

        const hookResult = await method(result, ctx);
        if (hookResult !== undefined) {
          result = hookResult;
        }
      }
    }

    return result;
  }

  /**
   * Get methods from a resolved hook for a specific hook method key.
   *
   * Returns an empty array if the hook doesn't have methods for this key,
   * which is normal - not every hook handles every operation.
   *
   * Multiple methods can be registered for the same hook key.
   *
   * @param resolved - The resolved hook
   * @param methodKey - The hook method key (e.g., 'beforeFind')
   * @param filter - Optional predicate over each method's metadata
   * @returns Array of objects containing bound method and pre-computed spec
   */
  getMethods<T>(
    resolved: ResolvedHook,
    methodKey: HookMethodKeyType,
    filter?: HookMethodFilter,
  ): Array<{
    method: (payload: T, ctx?: unknown) => Promise<T>;
    spec: SpecificationInterface;
  }> {
    const methodInfos = resolved.methods?.get(methodKey);
    if (!methodInfos || methodInfos.length === 0) {
      return [];
    }

    const result: Array<{
      method: (payload: T, ctx?: unknown) => Promise<T>;
      spec: SpecificationInterface;
    }> = [];

    for (const methodInfo of methodInfos) {
      if (filter && !filter(methodInfo.metadata)) {
        continue;
      }

      result.push({
        method: methodInfo.method.bind(resolved.hook),
        spec: methodInfo.resolvedSpec,
      });
    }

    return result;
  }

  /**
   * Resolve hook configurations to hook instances.
   */
  private resolveHooks(configs: HookWithSpec[]): ResolvedHook[] {
    return configs.map((config) => this.resolveConfig(config));
  }

  /**
   * Resolve a single hook configuration to an instance.
   * Uses pre-computed method mappings from `@Hook()` decorator for O(1) lookup.
   */
  private resolveConfig(config: HookWithSpec): ResolvedHook {
    let hook: object;

    try {
      hook = this.moduleRef.get(config.hook, { strict: false });
    } catch (error) {
      throw new HookProviderNotFoundException(config.hook.name, {
        originalError: error,
      });
    }

    // Get pre-computed method mappings from @Hook() decorator
    const methods = this.reflector.get<
      Map<HookMethodKeyType, HookMethodMapInterface[]>
    >(HOOK_METHODS_CACHE_KEY, config.hook);

    if (!methods) {
      throw new HookNotDecoratedException(config.hook.name);
    }

    return { hook, spec: config.spec, methods };
  }
}
