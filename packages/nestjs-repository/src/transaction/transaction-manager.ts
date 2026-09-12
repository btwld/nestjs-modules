import { Logger } from '@nestjs/common';

import { AppContextHost } from '@concepta/nestjs-core';

import { TransactionClosedException } from '../exceptions/transaction-closed.exception.js';
import { TransactionHeuristicCommitException } from '../exceptions/transaction-heuristic-commit.exception.js';
import { type TransactionFactoryInterface } from '../interfaces/transaction-factory.interface.js';

import { type TransactionManagerInterface } from './interfaces/transaction-manager.interface.js';
import { type TransactionInterface } from './interfaces/transaction.interface.js';
import { type TransactionFactoryRegistry } from './transaction-factory-registry.js';

/**
 * Runtime manager holding the transactions (one per driver:datasource key)
 * for a single {@link TransactionScope.run} scope, lazy transaction
 * creation via factory registry, and post-commit/rollback callbacks.
 *
 * Also owns that scope's lifecycle: `enter()`/`exit()` refcount concurrent
 * `run()` calls sharing the same scope, and `close()` permanently closes it
 * once settled so a stale handle fails loudly via `getOrStart` instead of
 * silently falling through to non-transactional access.
 */
export class TransactionManager implements TransactionManagerInterface {
  private readonly transactions = new Map<
    string,
    Promise<TransactionInterface>
  >();
  private readonly commitCallbacks: (() => void | Promise<void>)[] = [];
  private readonly rollbackCallbacks: (() => void | Promise<void>)[] = [];
  private readonly abortController = new AbortController();
  private depth = 0;
  private closed = false;
  private failed = false;

  constructor(
    private readonly registry: TransactionFactoryRegistry,
    private readonly readOnly: boolean = false,
    private readonly scopeHost: AppContextHost = new AppContextHost(),
  ) {}

  get isSupported(): boolean {
    return this.registry.count > 0;
  }

  get isReadOnly(): boolean {
    return this.readOnly;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  get hasFailed(): boolean {
    return this.failed;
  }

  /**
   * Aborts once the scope is doomed — a participant's operation threw, or
   * `settle()`'s commit failed — carrying that failure as `signal.reason`.
   * Stays unaborted for a scope that settles successfully. Cooperative:
   * nothing in this library forcibly stops an operation that ignores it.
   */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * The `AppContextHost` that created this scope — the host `run()` first
   * saw `!supports(TrxCtx)` on, as opposed to a joining participant's own
   * run-scoped child. `settle()` releases `TrxCtx` from this host, not from
   * whichever participant happened to exit last, since exit order need not
   * match creation order (e.g. an outer participant that times out exits
   * before a still-running nested one).
   */
  get host(): AppContextHost {
    return this.scopeHost;
  }

  enter(): number {
    if (this.closed) {
      throw new TransactionClosedException();
    }

    return ++this.depth;
  }

  exit(): number {
    return --this.depth;
  }

  markFailed(reason?: unknown): void {
    this.failed = true;
    this.abortController.abort(reason);
  }

  close(): void {
    this.closed = true;
  }

  /**
   * Get the current transaction for the given key, or create one lazily
   * via the factory registry if none exists.
   *
   * The in-flight promise — not the resolved transaction — is cached, and
   * the cache write happens before anything is awaited. That keeps two
   * concurrent calls for the same key from interleaving: whichever runs
   * first creates and starts the transaction, and the second sees the
   * cached promise and joins it instead of starting a rival one.
   */
  async getOrStart(key: string): Promise<TransactionInterface> {
    if (this.closed) {
      throw new TransactionClosedException();
    }

    const existing = this.transactions.get(key);
    if (existing) {
      return existing;
    }

    const factory = this.registry.get(key);
    if (!factory) {
      throw new Error(`No transaction factory registered for key "${key}"`);
    }

    const pending = this.startTransaction(factory);
    this.transactions.set(key, pending);

    return pending;
  }

  private async startTransaction(
    factory: TransactionFactoryInterface,
  ): Promise<TransactionInterface> {
    const tx = factory.create();
    await tx.start();
    return tx;
  }

  /**
   * Commit all active transactions, sequentially, stopping at the first
   * failure. Whichever transactions haven't committed yet when that
   * happens — the failed one and everything after it — are rolled back
   * instead of left dangling. Throws the raw underlying error when nothing
   * had committed yet — rolling everything back is then a clean, atomic
   * outcome, whether one datasource was involved or several — or
   * {@link TransactionHeuristicCommitException} once at least one
   * datasource has already committed, since that earlier commit can't be
   * undone without real two-phase commit, leaving an inherently mixed
   * ("heuristic") outcome across datasources.
   */
  async commitAll(): Promise<void> {
    const active = (await this.startedTransactions()).filter(
      (tx) => tx.isActive,
    );

    let committedCount = 0;
    let originalError: unknown;

    for (const tx of active) {
      try {
        await tx.commit();
        committedCount++;
      } catch (error) {
        originalError = error;
        break;
      }
    }

    if (originalError === undefined) {
      return;
    }

    await this.settleAll(active.slice(committedCount), (tx) => tx.rollback());

    if (committedCount === 0) {
      throw originalError;
    }

    throw new TransactionHeuristicCommitException(
      committedCount,
      active.length - committedCount,
      { originalError },
    );
  }

  /**
   * Rollback all active transactions. Every one is attempted even if an
   * earlier one fails — rollback is best-effort cleanup, so a failure is
   * logged rather than thrown, and never abandons the rest.
   */
  async rollbackAll(): Promise<void> {
    const active = (await this.startedTransactions()).filter(
      (tx) => tx.isActive,
    );

    await this.settleAll(active, (tx) => tx.rollback());
  }

  /**
   * Attempt `settle` on every given transaction, even if some fail. Never
   * throws — failures are logged, matching the swallow-and-log style of
   * {@link flushOnCommitCallbacks}/{@link flushOnRollbackCallbacks}.
   */
  private async settleAll(
    transactions: TransactionInterface[],
    settle: (tx: TransactionInterface) => Promise<void>,
  ): Promise<void> {
    const results = await Promise.allSettled(transactions.map(settle));
    this.logRejections(results, 'Transaction rollback failed');
  }

  /**
   * Log a single rejection reason. A rejection reason can be anything a
   * caller threw — including `null`/`undefined`, a plain object, or a
   * `Symbol` — so both the `.stack` read and the string interpolation are
   * guarded rather than assumed safe.
   */
  private logRejection(reason: unknown, message: string): void {
    let description: string;
    try {
      description = `${reason}`;
    } catch {
      description = '<unstringifiable rejection reason>';
    }

    Logger.error(
      `${message}: ${description}`,
      reason instanceof Error ? reason.stack : undefined,
    );
  }

  /**
   * Log every rejected result from an `allSettled` batch.
   */
  private logRejections(
    results: PromiseSettledResult<unknown>[],
    message: string,
  ): void {
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logRejection(result.reason, message);
      }
    });
  }

  /**
   * Transactions whose `start()` actually succeeded. A key whose `start()`
   * rejected never began, so there is nothing to commit or roll back for
   * it — surfacing that rejection here would replace the caller's real
   * error instead of the one that led to settlement.
   */
  private async startedTransactions(): Promise<TransactionInterface[]> {
    const results = await Promise.allSettled(this.transactions.values());
    return results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
  }

  onCommit(fn: () => void | Promise<void>): void {
    if (this.closed) {
      throw new TransactionClosedException();
    }

    this.commitCallbacks.push(fn);
  }

  onRollback(fn: () => void | Promise<void>): void {
    if (this.closed) {
      throw new TransactionClosedException();
    }

    this.rollbackCallbacks.push(fn);
  }

  async flushOnCommitCallbacks(): Promise<void> {
    await this.flushCallbacks(
      this.commitCallbacks.splice(0),
      'Transaction onCommit Callback Error',
    );
  }

  async flushOnRollbackCallbacks(): Promise<void> {
    await this.flushCallbacks(
      this.rollbackCallbacks.splice(0),
      'Transaction onRollback Callback Error',
    );
  }

  /**
   * Run callbacks one at a time, in registration order, rather than
   * concurrently — each callback fully resolves (or rejects) before the
   * next one starts. Every callback still runs even if an earlier one
   * rejects; a rejection is logged, not thrown.
   */
  private async flushCallbacks(
    callbacks: (() => void | Promise<void>)[],
    message: string,
  ): Promise<void> {
    for (const callback of callbacks) {
      try {
        await callback();
      } catch (error) {
        this.logRejection(error, message);
      }
    }
  }
}
