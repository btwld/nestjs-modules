import { RuntimeException } from '@concepta/nestjs-core';
import { type TransactionInterface } from '@concepta/nestjs-repository';

import { type DrizzleClient } from '../drizzle-repository.types.js';

/** Settles a run of Drizzle's `transaction()` from outside it. */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** Ends a transaction's callback so Drizzle rolls it back. */
class DrizzleRollback extends Error {
  constructor() {
    super('rollback');
  }
}

/**
 * Drizzle implementation of a transaction.
 *
 * Drizzle opens a transaction only around a callback, while a transaction
 * here is started, then committed or rolled back. `start()` opens one whose
 * callback waits until `commit()` or `rollback()` settles it: returning
 * commits, throwing rolls back.
 */
export class DrizzleTransaction implements TransactionInterface {
  private open?: {
    client: DrizzleClient;
    outcome: Deferred<void>;
    settled: Promise<void>;
  };

  constructor(private readonly db: DrizzleClient) {}

  get isActive(): boolean {
    return this.open !== undefined;
  }

  /** The transaction's database, for every read and write in it. */
  get client(): DrizzleClient {
    if (!this.open) {
      throw new RuntimeException({
        message: 'No active transaction - cannot get client',
        fault: 'internal',
      });
    }
    return this.open.client;
  }

  async start(): Promise<void> {
    const opened = deferred<DrizzleClient>();
    const outcome = deferred<void>();

    const settled = this.db.transaction(async (tx) => {
      opened.resolve(tx);
      await outcome.promise;
    });

    // A transaction that fails to begin settles before its callback runs.
    const client = await Promise.race([
      opened.promise,
      settled.then(() => {
        throw new RuntimeException({
          message: 'The transaction ended before it started',
          fault: 'internal',
        });
      }),
    ]);

    this.open = { client, outcome, settled };
  }

  async commit(): Promise<void> {
    const open = this.open;
    if (!open) {
      throw new RuntimeException({
        message: 'No active transaction to commit',
        fault: 'internal',
      });
    }
    this.open = undefined;
    open.outcome.resolve();
    await open.settled;
  }

  /**
   * Roll back the transaction. Safe to call when none is active.
   */
  async rollback(): Promise<void> {
    const open = this.open;
    if (!open) return;
    this.open = undefined;
    open.outcome.reject(new DrizzleRollback());
    try {
      await open.settled;
    } catch (error) {
      if (!(error instanceof DrizzleRollback)) throw error;
    }
  }

  getClient<T = DrizzleClient>(): T {
    return this.client as T;
  }
}
