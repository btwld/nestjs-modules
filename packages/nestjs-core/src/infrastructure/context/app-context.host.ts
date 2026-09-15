import { type PlainLiteralObject } from '@nestjs/common';

import { type AppContextLike } from '../../domain/context/app-context-like.type.js';
import { type AppContextInterface } from '../../domain/context/interfaces/app-context.interface.js';
import { type OverlayRef } from '../../domain/context/overlay-ref.js';
import { type RefsToMethods } from '../../domain/context/refs-to-methods.type.js';

import { OverlayNotDefinedException } from './exceptions/overlay-not-defined.exception.js';

/**
 * Symbol key used to store the context on the request object.
 */
export const APP_CONTEXT_KEY = Symbol('APP_CONTEXT_KEY');

// ---------------------------------------------------------------------------
// Proxy handler — intercepts undefined `with*` calls
// ---------------------------------------------------------------------------

const proxyHandler: ProxyHandler<AppContextHost> = {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (value !== undefined) return value;

    if (typeof prop === 'string' && prop.startsWith('with')) {
      throw new OverlayNotDefinedException(prop);
    }

    return value;
  },
};

/**
 * Per-request context container backed by typed overlays.
 *
 * Overlays are defined via {@link defineOverlay} and accessed through
 * typed `with*()` methods. The proxy constructor intercepts calls to
 * undefined `with*` methods and throws {@link OverlayNotDefinedException}.
 *
 * @example
 * ```typescript
 * // In an overlay's attach():
 * const ctx = getAppContext(request);
 * ctx.defineOverlay(this.ref, resolvedValues);
 *
 * // In a handler:
 * const typed = ctx.require(WithFeature);
 * const feature = typed.withFeature();
 * ```
 */
export class AppContextHost implements AppContextInterface {
  constructor() {
    return new Proxy(this, proxyHandler);
  }

  /**
   * Define an overlay on this context instance by ref and pre-resolved values.
   *
   * Installs a `with*()` method that returns the provided values wrapped
   * in a prototype-chain child of this context.
   *
   * Idempotent — if the overlay name already exists on `this`, this is a no-op.
   */
  defineOverlay<Name extends string, Props extends PlainLiteralObject>(
    ref: OverlayRef<Name, Props, unknown[]>,
    values: Props,
  ): void {
    const name = ref.name;

    if (Object.prototype.hasOwnProperty.call(this, name)) return;

    Object.defineProperty(this, name, {
      value: function (this: AppContextHost) {
        return Object.assign(Object.create(this), values);
      },
      enumerable: false,
      configurable: true,
      writable: false,
    });
  }

  /**
   * Remove a previously defined overlay from this context instance.
   *
   * Only removes an overlay owned directly by this instance — an overlay
   * inherited from a parent (e.g. a `with()` child's prototype) is left
   * untouched. Returns whether an own overlay was removed.
   */
  removeOverlay(
    ref: OverlayRef<string, PlainLiteralObject, unknown[]>,
  ): boolean {
    if (!Object.prototype.hasOwnProperty.call(this, ref.name)) return false;
    return Reflect.deleteProperty(this, ref.name);
  }

  /**
   * Type-level narrowing gate.
   *
   * Returns `this` cast to include the typed `with*()` methods for the
   * given refs. No runtime validation — the proxy handles undefined overlays.
   */
  require<R extends OverlayRef<string, PlainLiteralObject, unknown[]>[]>(
    ..._refs: R
  ): this & RefsToMethods<R[number]> {
    return this as this & RefsToMethods<R[number]>;
  }

  /**
   * Direct lookup by ref. Returns the resolved overlay props.
   */
  with<
    Name extends string,
    Props extends PlainLiteralObject,
    Args extends unknown[],
  >(ref: OverlayRef<Name, Props, Args>, ...args: Args): Props {
    const fn = Reflect.get(this, ref.name);

    if (typeof fn !== 'function') {
      throw new OverlayNotDefinedException(ref.name);
    }

    // Cast required: runtime-assigned overlay method return type cannot be
    // statically inferred from the dynamic Reflect.get lookup.
    return Reflect.apply(fn, this, args) as Props;
  }

  /**
   * Check if an overlay is defined on this context.
   */
  supports(ref: OverlayRef<string, PlainLiteralObject, unknown[]>): boolean {
    return ref.name in this;
  }

  /**
   * Returns a proxy where calling any overlay method returns the
   * resolved overlay if defined, or `this` unchanged if not.
   */
  optional(): Record<string, () => this> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return new Proxy(
      {},
      {
        get(_target, prop: string) {
          return (...args: unknown[]) => {
            try {
              const fn = Reflect.get(self, prop);
              if (typeof fn === 'function') {
                return Reflect.apply(fn, self, args);
              }
            } catch {
              // proxy guard threw — overlay not defined, fall through
            }
            return self;
          };
        },
      },
    );
  }

  /**
   * Resolve an `AppContextLike` value to a guaranteed `AppContextHost`.
   *
   * - `AppContextHost` → returns as-is
   * - `undefined`, `null`, or empty `{}` → returns a new `AppContextHost`
   * - Non-empty non-AppContextHost object → throws
   */
  static from(value?: AppContextLike): AppContextHost {
    if (value instanceof AppContextHost) return value;
    if (
      value === undefined ||
      value === null ||
      Object.keys(value).length === 0
    ) {
      return new AppContextHost();
    }
    throw new Error(
      `Expected AppContextHost or nullish value, got ${typeof value}`,
    );
  }
}
