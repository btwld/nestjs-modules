/**
 * A tiny FIFO async lock: `acquire()` resolves, in call order, once every
 * earlier caller has released. Used to serialize transactions for a
 * connection that cannot have more than one active on it at a time — see
 * {@link TransactionFactoryInterface.supportsConcurrentTransactions}.
 */
export class TransactionQueue {
  private tail: Promise<void> = Promise.resolve();

  /**
   * Wait for the queue's current tail, then return this call's release
   * function. `release` is always reassigned before `acquire()` returns —
   * a `Promise` executor runs synchronously — so the noop initializer is
   * never actually called; it exists only to satisfy the compiler without
   * a non-null assertion.
   *
   * `signal`, when given, cancels the wait rather than the slot: an
   * aborted wait still calls `release()` before rejecting, so a caller
   * that stops waiting (e.g. a timed-out `TransactionManager` scope) never
   * blocks the next one in line behind it.
   */
  async acquire(signal?: AbortSignal): Promise<() => void> {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    const waitFor = this.tail;
    this.tail = waitFor.then(() => held);

    if (signal) {
      await this.waitOrAbort(waitFor, signal, release);
    } else {
      await waitFor;
    }

    return release;
  }

  private waitOrAbort(
    waitFor: Promise<void>,
    signal: AbortSignal,
    release: () => void,
  ): Promise<void> {
    if (signal.aborted) {
      release();
      return Promise.reject(signal.reason);
    }

    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        release();
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      waitFor.then(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      });
    });
  }
}
