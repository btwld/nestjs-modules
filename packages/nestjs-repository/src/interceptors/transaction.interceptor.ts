import { Observable } from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { TransactionalRunner } from '../transaction/transactional-runner.js';

/**
 * Interceptor that wraps requests in transactions.
 *
 * Delegates to {@link TransactionalRunner} which checks for
 * `@Transactional()` metadata and wraps the operation in a
 * {@link TransactionScope} if present.
 *
 * Applied automatically by the `@Transactional()` decorator.
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly txRunner: TransactionalRunner) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return this.txRunner.run(context, () => next.handle());
  }
}
