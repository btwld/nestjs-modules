import { type TransactionInterface } from './transaction.interface.js';

/**
 * Manages the transactions (one per driver:datasource key) that belong to
 * a single {@link TransactionScope.run} scope, plus that scope's own
 * lifecycle (entry/exit refcount, settled state).
 */
export interface TransactionManagerInterface {
  /**
   * Whether real transaction support is available (factories registered).
   */
  readonly isSupported: boolean;

  /**
   * Whether this scope was opened with `readOnly: true`.
   */
  readonly isReadOnly: boolean;

  /**
   * Whether the scope has settled (committed or rolled back) and can no
   * longer be used.
   */
  readonly isClosed: boolean;

  /**
   * Whether the scope's operation has thrown.
   */
  readonly hasFailed: boolean;

  /**
   * Aborts once the scope is doomed — a participant's operation threw, or
   * the final commit failed — carrying that failure as `signal.reason`.
   * Stays unaborted for a scope that settles successfully. Cooperative:
   * nothing in this library forcibly stops an operation that ignores it.
   */
  readonly signal: AbortSignal;

  /**
   * Mark that a `run()` call has entered this scope. Returns the resulting
   * depth. Throws `TransactionClosedException` once the scope is closed —
   * a stale handle re-entering a settled scope must fail loudly rather
   * than refcount and eventually re-settle it.
   */
  enter(): number;

  /**
   * Mark that a `run()` call has exited this scope. Returns the resulting
   * depth — the scope should settle when this reaches 0.
   */
  exit(): number;

  /**
   * Mark the scope's operation as having thrown, and abort `signal` with
   * `reason`. If `reason` is not given, `signal.reason` is not `undefined`
   * — `AbortController.abort()` installs a synthetic `AbortError` instead,
   * per the platform `AbortSignal` contract. Idempotent — the first reason
   * wins.
   */
  markFailed(reason?: unknown): void;

  /**
   * Close the scope. Once closed, `getOrStart`, `enter`, `onCommit` and
   * `onRollback` all throw `TransactionClosedException` — the scope is
   * inert from this point on, including for a still-running orphaned
   * operation that outlived a timeout.
   */
  close(): void;

  /**
   * Commit all active transactions, sequentially, stopping at the first
   * failure. Transactions that haven't committed yet at that point are
   * rolled back rather than abandoned. Throws the raw underlying error when
   * nothing had committed yet — a clean, atomic rollback, regardless of how
   * many datasources were involved — or `TransactionHeuristicCommitException`
   * once at least one datasource has already committed, since that commit
   * can't be undone without real 2PC, leaving an inherently mixed outcome.
   */
  commitAll(): Promise<void>;

  /**
   * Rollback all active transactions. Every one is attempted even if an
   * earlier one fails — a failure is logged, not thrown, so it never
   * abandons the rest or replaces an error the caller is already handling.
   */
  rollbackAll(): Promise<void>;

  /**
   * Get the current transaction for the given key, or create one lazily
   * via the factory registry if none exists. Throws once the scope is
   * closed.
   */
  getOrStart(key: string): Promise<TransactionInterface>;

  /**
   * Register a callback to run after all transactions commit successfully.
   * Throws `TransactionClosedException` once the scope is closed, rather
   * than silently dropping a registration nothing will ever flush.
   */
  onCommit(fn: () => void | Promise<void>): void;

  /**
   * Register a callback to run after transactions are rolled back. A
   * `readOnly` scope always rolls back, so these run whether or not its
   * operation succeeded. Throws `TransactionClosedException` once the
   * scope is closed, rather than silently dropping a registration nothing
   * will ever flush.
   */
  onRollback(fn: () => void | Promise<void>): void;

  /**
   * Execute and clear all onCommit callbacks, one at a time in
   * registration order — not concurrently. A rejection is logged, not
   * thrown, and doesn't stop the callbacks after it from running.
   */
  flushOnCommitCallbacks(): Promise<void>;

  /**
   * Execute and clear all onRollback callbacks, one at a time in
   * registration order — not concurrently. A rejection is logged, not
   * thrown, and doesn't stop the callbacks after it from running.
   */
  flushOnRollbackCallbacks(): Promise<void>;
}
