/** Settles a run of Drizzle's `transaction()` from outside it. */
export interface DrizzlePostgresDeferredInterface<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
