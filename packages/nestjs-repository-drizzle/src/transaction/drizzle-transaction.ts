import { RuntimeException } from '@concepta/nestjs-core';
import { type TransactionInterface } from '@concepta/nestjs-repository';

import { type DrizzleDeferredInterface } from './drizzle-deferred.interface.js';

function deferred<T>(): DrizzleDeferredInterface<T> {
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
 * Drizzle implementation of a transaction, shared by every database's
 * adapter.
 *
 * Drizzle opens a transaction only around a callback, while a transaction
 * here is started, then committed or rolled back. `start()` opens one whose
 * callback waits until `commit()` or `rollback()` settles it: returning
 * commits, throwing rolls back.
 */
export abstract class DrizzleTransaction<
  Client,
> implements TransactionInterface {
  private open?: {
    client: Client;
    outcome: DrizzleDeferredInterface<void>;
    settled: Promise<void>;
  };

  /** Run `work` in a new transaction on the connection's database. */
  protected abstract begin(work: (tx: Client) => Promise<void>): Promise<void>;

  get isActive(): boolean {
    return this.open !== undefined;
  }

  /** The transaction's database, for every read and write in it. */
  getClient(): Client {
    if (!this.open) {
      throw new RuntimeException({
        message: 'No active transaction - cannot get client',
        fault: 'internal',
      });
    }
    return this.open.client;
  }

  async start(): Promise<void> {
    const opened = deferred<Client>();
    const outcome = deferred<void>();

    const settled = this.begin(async (tx) => {
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
}
