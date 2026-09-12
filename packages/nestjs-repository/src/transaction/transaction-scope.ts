import {
  Injectable,
  Inject,
  Logger,
  type OnApplicationBootstrap,
  Optional,
  PlainLiteralObject,
} from '@nestjs/common';

import { AppContextHost } from '@concepta/nestjs-core';

import { TransactionReadOnlyConflictException } from '../exceptions/transaction-read-only-conflict.exception.js';
import { TransactionScopeFailedException } from '../exceptions/transaction-scope-failed.exception.js';
import { TransactionTimeoutException } from '../exceptions/transaction-timeout.exception.js';
import { RepositoryModuleOptionsInterface } from '../interfaces/repository-module-options.interface.js';
import { REPOSITORY_MODULE_OPTIONS } from '../repository.constants.js';

import {
  TransactionContextInterface,
  TrxCtx,
} from './interfaces/transaction-context.interface.js';
import {
  TransactionFactoryRegistry,
  TRANSACTION_FACTORY_REGISTRY,
} from './transaction-factory-registry.js';
import { TransactionManager } from './transaction-manager.js';

const DEFAULT_TIMEOUT = 30000;

export interface TransactionRunOptions {
  readOnly?: boolean;
  timeout?: number;
}

/**
 * Orchestrates transaction lifecycle.
 *
 * Every unit of work calls `run()`. The first `run()` on a given context
 * defines `TrxCtx` and owns the scope; concurrent/nested `run()` calls on
 * the same context detect `TrxCtx` is already defined and join it — all
 * participants share one `TransactionManager`, refcounted via
 * `enter()`/`exit()`. The scope settles when the last participant exits, or
 * immediately if any participant times out — closes, commits/rolls back,
 * removes `TrxCtx` from the context, then flushes the matching callbacks —
 * in that order, so a callback doing repository work on the same ctx gets
 * non-transactional access rather than the just-settled transaction. The
 * context is left exactly as `run()` found it, so a later, unrelated
 * `run()` on the same context starts a fresh scope.
 *
 * The `TransactionManager` is also re-declared directly on the run-scoped
 * `txCtx` child, so a handle held past its scope's settlement (e.g. an
 * operation that outlived a timeout) keeps resolving `TrxCtx` — its next
 * `getOrStart()` call throws `TransactionClosedException` rather than
 * silently falling through to non-transactional access.
 *
 * @example
 * ```typescript
 * async execute(command: CreateCacheCommand): Promise<Cache> {
 *   return this.txScope.run(command.ctx, async (txCtx) => {
 *     const cache = Cache.create(eventContext, dto, expirationDate);
 *     await cacheRepo.save(txCtx, cache);
 *     txCtx.trx.onCommit(() => cache.commit());
 *     return cache;
 *   });
 * }
 * ```
 */
@Injectable()
export class TransactionScope implements OnApplicationBootstrap {
  private readonly defaultTimeout: number;
  private warnedEmptyRegistry = false;

  constructor(
    @Inject(TRANSACTION_FACTORY_REGISTRY)
    private readonly registry: TransactionFactoryRegistry,
    @Optional()
    @Inject(REPOSITORY_MODULE_OPTIONS)
    options?: RepositoryModuleOptionsInterface,
  ) {
    this.defaultTimeout = options?.defaultTimeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * By bootstrap, every `forFeature` transaction factory has registered
   * (registration happens in provider factories, instantiated during DI —
   * see `RepositoryModule.forFeature`), so the count is final here. An
   * empty registry means every `run()` in this app executes without a
   * transaction: writes are not atomic and `onRollback` callbacks never
   * fire, silently, since nothing else in this class distinguishes that
   * case from a real commit.
   */
  onApplicationBootstrap(): void {
    this.warnEmptyRegistryOnce();
  }

  /**
   * Repeated at the first `run()`, not just at bootstrap: a custom
   * `app.useLogger()` transport wired up after lifecycle hooks have already
   * run would otherwise let the boot-time warning go nowhere, with no
   * second chance to see it.
   */
  private warnEmptyRegistryOnce(): void {
    if (this.warnedEmptyRegistry || this.registry.count > 0) {
      return;
    }

    this.warnedEmptyRegistry = true;
    Logger.warn(
      'No transaction factory is registered. TransactionScope.run() will ' +
        'execute without a transaction: writes are not atomic and ' +
        'onRollback callbacks never fire. Register a repository module ' +
        'that provides one, e.g. RepositoryModule.forFeature({ module: ' +
        'TypeOrmRepositoryModule, ... }).',
      TransactionScope.name,
    );
  }

  /**
   * Execute an operation within a transaction scope.
   *
   * Defines `TrxCtx` on the context if not already present, then runs the
   * full lifecycle ceremony. Nesting/concurrency is detected via
   * `ctx.supports(TrxCtx)`; participants share one scope, refcounted via
   * `enter()`/`exit()`, and the scope settles when the last one exits.
   */
  async run<T>(
    ctx: PlainLiteralObject,
    operation: (txCtx: TransactionContextInterface) => Promise<T>,
    options?: TransactionRunOptions,
  ): Promise<T> {
    this.warnEmptyRegistryOnce();

    const appCtx = AppContextHost.from(ctx);
    const timeout = options?.timeout ?? this.defaultTimeout;

    if (!appCtx.supports(TrxCtx)) {
      appCtx.defineOverlay(TrxCtx, {
        trx: new TransactionManager(
          this.registry,
          options?.readOnly ?? false,
          appCtx,
        ),
      });
    } else if (
      options?.readOnly !== undefined &&
      options.readOnly !== appCtx.with(TrxCtx).trx.isReadOnly
    ) {
      // readOnly is decided once, by whichever run() created the scope —
      // joining it with a conflicting readOnly would either silently roll
      // back writes the caller expected to persist, or silently drop
      // runReadOnly()'s "must not persist" guarantee.
      throw new TransactionReadOnlyConflictException();
    }

    const txCtx = appCtx.with(TrxCtx);
    const { trx } = txCtx;

    // Re-declared on the run-scoped child — see class-level doc comment.
    AppContextHost.from(txCtx).defineOverlay(TrxCtx, { trx });

    trx.enter();

    let result: T;
    let timedOut = false;

    try {
      result = await this.withTimeout(operation(txCtx), timeout);
    } catch (error) {
      timedOut = error instanceof TransactionTimeoutException;
      trx.markFailed(error);
      throw error;
    } finally {
      // A timeout abandons this participant's operation while it may still
      // be running — possibly forever, if it's hung on a dead connection or
      // a stuck lock wait. Waiting for the refcount to reach 0 would leave
      // the scope, and ctx, doomed but live for as long as that takes.
      // Settling right away — regardless of depth — releases ctx
      // immediately: a retry starts a genuinely fresh scope instead of
      // joining the doomed one, and the still-running orphan's next
      // getOrStart/onCommit/onRollback throws TransactionClosedException
      // rather than silently racing an in-flight settlement. Safe because
      // `settle()` is idempotent and, on this path, trx.hasFailed is
      // already set — it can only take the rollbackAll() branch, which
      // never throws, so this can't replace the timeout error below.
      if (trx.exit() === 0 || timedOut) {
        await this.settle(trx);
      }
    }

    // This participant's own operation succeeded, but a sibling — nested
    // or concurrent, sharing the same scope — may have failed and doomed
    // it anyway. Checked after the finally, not inside the try, so it
    // can't mask a real error from the operation or from settle().
    if (trx.hasFailed) {
      throw new TransactionScopeFailedException({
        originalError: trx.signal.reason,
      });
    }

    return result;
  }

  /**
   * Settle a scope: close it, commit or roll back, remove `TrxCtx` — so a
   * callback doing repository work on the same ctx gets non-transactional
   * access rather than the just-settled transaction — then flush the
   * matching callbacks. Called once the last participant exits, or sooner
   * if a participant's `run()` times out.
   *
   * Idempotent: a timeout forces settlement ahead of the refcount reaching
   * 0 (see `run()`), so the participant that eventually does bring it to 0
   * may find the scope already closed and must do nothing further — this
   * is a no-op in that case.
   *
   * Releases `TrxCtx` from `trx.host`, the host that created the scope —
   * not necessarily this call's own `appCtx`, since the last participant to
   * exit need not be the first one to have entered (e.g. an outer
   * participant that times out exits before a still-running nested one).
   * Releasing the wrong host would leave the creator's `TrxCtx` stranded.
   *
   * Closes the scope *before* committing/rolling back, not after: a still
   * -running orphaned operation (one that outlived a timeout) can call
   * `getOrStart`/`onCommit`/`onRollback` at any point while settlement is
   * in flight, and without this, it could start a transaction — or
   * register a callback — that this settlement's already-taken snapshot
   * will never commit, roll back, or flush.
   *
   * A commit failure's own fallback rollback already happens inside
   * `commitAll()` (only the transactions it didn't get to are rolled
   * back), so there is no second `rollbackAll()` here — one that would
   * otherwise re-attempt a rollback that already ran. `rollbackAll()`
   * itself never throws, so nothing between `markFailed` and the end of
   * this method can skip removing the overlay.
   */
  private async settle(trx: TransactionManager): Promise<void> {
    // Idempotent: a timeout can force settlement (see run()) before the
    // refcount reaches 0, so the participant that eventually does bring it
    // to 0 must find the scope already settled and do nothing further.
    if (trx.isClosed) {
      return;
    }

    trx.close();

    let settleError: unknown;

    try {
      if (trx.hasFailed || trx.isReadOnly) {
        await trx.rollbackAll();
      } else {
        await trx.commitAll();
      }
    } catch (error) {
      trx.markFailed(error);
      settleError = error;
    }

    trx.host.removeOverlay(TrxCtx);

    if (trx.hasFailed || trx.isReadOnly) {
      await trx.flushOnRollbackCallbacks();
    } else {
      await trx.flushOnCommitCallbacks();
    }

    if (settleError !== undefined) {
      throw settleError;
    }
  }

  /**
   * Execute an operation in a read-only transaction scope.
   * Shorthand for `run(ctx, operation, { readOnly: true })`.
   */
  async runReadOnly<T>(
    ctx: PlainLiteralObject,
    operation: (txCtx: TransactionContextInterface) => Promise<T>,
  ): Promise<T> {
    return this.run(ctx, operation, { readOnly: true });
  }

  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timedOut = false;

      const handle = setTimeout(() => {
        timedOut = true;
        reject(new TransactionTimeoutException(timeout));
      }, timeout);

      promise.then(
        (result) => {
          clearTimeout(handle);
          resolve(result);
        },
        (error) => {
          clearTimeout(handle);

          if (timedOut) {
            Logger.error(
              `Operation failed after its transaction timed out: ${error}`,
              error instanceof Error ? error.stack : undefined,
            );
            return;
          }

          reject(error);
        },
      );
    });
  }
}
