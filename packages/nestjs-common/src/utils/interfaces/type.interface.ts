export interface Type<T = unknown> {
  new (...args: unknown[]): T;
}
