const AUTHENTICATION_GUARDS = new WeakSet<object>();

/**
 * Records a guard class as one that authenticates, for the `requireAuth`
 * route audit rule. Every class `AuthGuard()` builds is recorded.
 */
export function markAuthenticationGuard(guard: object): void {
  AUTHENTICATION_GUARDS.add(guard);
}

/** Whether a guard class, or a class it extends, authenticates. */
export function isAuthenticationGuard(guard: object): boolean {
  for (
    let current: object | null = guard;
    current !== null;
    current = Reflect.getPrototypeOf(current)
  ) {
    if (AUTHENTICATION_GUARDS.has(current)) {
      return true;
    }
  }

  return false;
}
