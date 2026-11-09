/**
 * Options for defining an overlay on a context.
 */
export interface OverlayDefineOptionsInterface {
  /**
   * Protect the overlay from being altered once defined.
   *
   * The overlay cannot be removed and redefined, and redefining the same ref —
   * including shadowing it on a prototype child, or hardening one that is
   * already defined mutably — throws rather than silently doing nothing.
   *
   * The values are frozen **one level deep**: a frozen copy is stored, so
   * reassigning a top-level key has no effect, but an object nested inside
   * those values is still shared with whoever defined the overlay and stays
   * mutable. Freezing that is the definer's call — this option protects the
   * binding and the values it was handed, not the object graph underneath
   * them. Keeping overlay values flat sidesteps the question entirely.
   *
   * Opt-in, because an overlay with a lifecycle needs the opposite: `TrxCtx`
   * is removed at transaction teardown and deliberately re-declared on
   * run-scoped children.
   */
  immutable?: boolean;
}
