import { type PlainLiteralObject } from '@nestjs/common';

import { type AppContextLike } from '../../domain/context/app-context-like.type.js';
import { type AppContextInterface } from '../../domain/context/interfaces/app-context.interface.js';
import { type OverlayDefineOptionsInterface } from '../../domain/context/interfaces/overlay-define-options.interface.js';
import { type OverlayRef } from '../../domain/context/overlay-ref.js';
import { type RefsToMethods } from '../../domain/context/refs-to-methods.type.js';

import { OverlayAlreadyDefinedException } from './exceptions/overlay-already-defined.exception.js';
import { OverlayImmutableException } from './exceptions/overlay-immutable.exception.js';
import { OverlayNotDefinedException } from './exceptions/overlay-not-defined.exception.js';

/**
 * Symbol key used to store the context on the request object.
 */
export const APP_CONTEXT_KEY = Symbol('APP_CONTEXT_KEY');

/**
 * Marks an installed overlay method as immutable. Kept on the method itself
 * rather than in a side table so it travels the prototype chain for free —
 * which is what lets a child detect a parent's immutable overlay.
 */
const IMMUTABLE_OVERLAY = Symbol('IMMUTABLE_OVERLAY');

function isImmutableOverlay(value: unknown): boolean {
  return typeof value === 'function' && IMMUTABLE_OVERLAY in value;
}

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
   *
   * Pass `{ immutable: true }` for an overlay that must not change once set,
   * such as one carrying authorization input. See
   * {@link OverlayDefineOptionsInterface}.
   */
  defineOverlay<Name extends string, Props extends PlainLiteralObject>(
    ref: OverlayRef<Name, Props, unknown[]>,
    values: Props,
    options?: OverlayDefineOptionsInterface,
  ): void {
    const name = ref.name;

    // `name in this` rather than a read: the proxy's get trap throws
    // OverlayNotDefinedException for any undefined `with*` property, so
    // reading first would throw on every overlay's first definition. The
    // `has` trap is not overridden, so `in` is safe — and it walks the
    // prototype chain, which is what catches shadowing.
    if (name in this && isImmutableOverlay(Reflect.get(this, name))) {
      throw new OverlayImmutableException(name);
    }

    const immutable = options?.immutable === true;

    if (Object.prototype.hasOwnProperty.call(this, name)) {
      // Definition is idempotent, but silently swallowing a request to harden
      // would leave the caller believing an overlay is protected when it is
      // still removable, shadowable, and holding someone else's values.
      if (immutable) {
        throw new OverlayAlreadyDefinedException(name);
      }
      return;
    }
    // A copy, so freezing does not reach back and freeze the caller's own
    // object out from under them.
    const resolved = immutable ? Object.freeze({ ...values }) : values;

    const overlay = function (this: AppContextHost) {
      return Object.assign(Object.create(this), resolved);
    };

    if (immutable) {
      Object.defineProperty(overlay, IMMUTABLE_OVERLAY, { value: true });
    }

    Object.defineProperty(this, name, {
      value: overlay,
      enumerable: false,
      // Non-configurable when immutable, so removeOverlay() cannot clear it
      // and open the way to a redefinition.
      configurable: !immutable,
      writable: false,
    });
  }

  /**
   * Remove a previously defined overlay from this context instance.
   *
   * Only removes an overlay owned directly by this instance — an overlay
   * inherited from a parent (e.g. a `with()` child's prototype) is left
   * untouched. Returns whether an own overlay was removed.
   *
   * An overlay defined with `{ immutable: true }` is non-configurable, so this
   * returns `false` and leaves it in place.
   */
  removeOverlay(
    ref: OverlayRef<string, PlainLiteralObject, unknown[]>,
  ): boolean {
    if (!Object.prototype.hasOwnProperty.call(this, ref.name)) return false;
    return Reflect.deleteProperty(this, ref.name);
  }

  /**
   * Assert that each overlay is present, and narrow to its typed `with*()`
   * methods.
   *
   * Throws `OverlayNotDefinedException` on the first absent ref — the same
   * exception `with()` throws, so an absent overlay fails one way whichever
   * accessor found it. Use this to read an overlay a caller must supply;
   * `supports()` to branch on one that is genuinely optional.
   */
  require<R extends OverlayRef<string, PlainLiteralObject, unknown[]>[]>(
    ...refs: R
  ): this & RefsToMethods<R[number]> {
    for (const ref of refs) {
      if (!(ref.name in this)) {
        throw new OverlayNotDefinedException(ref.name);
      }
    }

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
   *
   * For chaining past an overlay that may be absent — the return type is
   * `this`, not the overlay's props, so a chain continues either way. To read
   * an overlay, use `require()` or `supports()`.
   *
   * Absence is decided by looking the method up, not by catching: an error
   * thrown by the overlay itself propagates rather than being reported as an
   * absent overlay.
   *
   * Only `with*` properties resolve to a callable. Anything else reads as
   * `undefined`, which keeps the proxy from answering for members it has no
   * overlay for — `then` in particular, since a proxy that reports a callable
   * `then` is a thenable, and awaiting one that never calls back hangs.
   */
  optional(): Record<string, () => this> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (typeof prop !== 'string' || !prop.startsWith('with')) {
            return undefined;
          }

          return (...args: unknown[]) => {
            if (!(prop in self)) {
              return self;
            }

            const fn = Reflect.get(self, prop);

            return typeof fn === 'function'
              ? Reflect.apply(fn, self, args)
              : self;
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
