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

  /** The error with which the database ended the transaction, if it has. */
  private ended?: { reason: unknown };

  /** Run `work` in a new transaction on the connection's database. */
  protected abstract begin(work: (tx: Client) => Promise<void>): Promise<void>;

  /**
   * Check the transaction can commit, before `commit()` ends it. Throws
   * when it cannot; the transaction is then still open to roll back.
   */
  protected async beforeCommit(_client: Client): Promise<void> {}

  get isActive(): boolean {
    return this.open !== undefined;
  }

  /**
   * The transaction's database, for every read and write in it. Refused
   * once the database has ended the transaction, so no later statement
   * runs outside it.
   */
  getClient(): Client {
    if (this.ended) {
      throw this.endedException(this.ended.reason);
    }
    if (!this.open) {
      throw new RuntimeException({
        message: 'No active transaction - cannot get client',
        fault: 'internal',
      });
    }
    return this.open.client;
  }

  /**
   * Record that the database ended the transaction with `reason`, such as a
   * deadlock it rolled the transaction back for. Every later `getClient()`
   * and `commit()` is refused; `rollback()` still ends it here.
   */
  end(reason: unknown): void {
    this.ended ??= { reason };
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
    if (this.ended) {
      throw this.endedException(this.ended.reason);
    }
    await this.beforeCommit(open.client);
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

  private endedException(reason: unknown): RuntimeException {
    return new RuntimeException({
      message:
        'The database ended this transaction, so nothing more can run in it',
      fault: 'internal',
      originalError: reason,
    });
  }
}
