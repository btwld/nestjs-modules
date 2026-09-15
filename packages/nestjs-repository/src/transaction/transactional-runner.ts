import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { getAppContext } from '@concepta/nestjs-core';

import { TransactionScope } from './transaction-scope.js';
import {
  TRANSACTIONAL_KEY,
  TransactionalOptions,
} from './transactional.decorator.js';

/**
 * Helper for running operations within transactions.
 *
 * Checks for `@Transactional()` metadata on the handler and wraps the
 * operation in a transaction if present. Designed to be used by
 * interceptors in consuming modules.
 *
 * @example
 * ```typescript
 * // In an interceptor
 * intercept(context: ExecutionContext, next: CallHandler) {
 *   return this.txRunner.run(context, () => next.handle());
 * }
 * ```
 */
@Injectable()
export class TransactionalRunner {
  constructor(
    private readonly reflector: Reflector,
    private readonly txScope: TransactionScope,
  ) {}

  /**
   * Run an operation, wrapping in a transaction if `@Transactional()` is present.
   *
   * Checks method-level metadata first, then class-level.
   * `@Transactional(false)` on a method disables the class-level transaction.
   *
   * @param context - The NestJS execution context
   * @param operation - The operation to run
   * @returns An Observable of the result
   */
  run<T>(
    context: ExecutionContext,
    operation: () => Observable<T>,
  ): Observable<T> {
    const options = this.reflector.getAllAndOverride<
      TransactionalOptions | false
    >(TRANSACTIONAL_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return operation();
    }

    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);

    return from(
      this.txScope.run(ctx, () => this.toPromise(operation()), {
        readOnly: options.readOnly,
        timeout: options.timeout,
      }),
    ).pipe(catchError((error) => throwError(() => error)));
  }

  /**
   * Convert Observable to Promise.
   */
  private toPromise<T>(observable: Observable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      let result: T;
      observable.subscribe({
        next: (value) => {
          result = value;
        },
        error: (err) => reject(err),
        complete: () => resolve(result),
      });
    });
  }
}
