import { RuntimeException } from '@concepta/nestjs-core';
import { type TransactionInterface } from '@concepta/nestjs-repository';

import { type DrizzlePostgresDeferredInterface } from './drizzle-postgres-deferred.interface.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

function deferred<T>(): DrizzlePostgresDeferredInterface<T> {
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
 * Drizzle implementation of a transaction, on Postgres.
 *
 * Drizzle opens a transaction only around a callback, while a transaction
 * here is started, then committed or rolled back. `start()` opens one whose
 * callback waits until `commit()` or `rollback()` settles it: returning
 * commits, throwing rolls back.
 */
export class DrizzlePostgresTransaction implements TransactionInterface {
  private open?: {
    client: DrizzlePostgresClient;
    outcome: DrizzlePostgresDeferredInterface<void>;
    settled: Promise<void>;
  };

  constructor(private readonly db: DrizzlePostgresClient) {}

  get isActive(): boolean {
    return this.open !== undefined;
  }

  /** The transaction's database, for every read and write in it. */
  getClient(): DrizzlePostgresClient {
    if (!this.open) {
      throw new RuntimeException({
        message: 'No active transaction - cannot get client',
        fault: 'internal',
      });
    }
    return this.open.client;
  }

  async start(): Promise<void> {
    const opened = deferred<DrizzlePostgresClient>();
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
}
