import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';

import { TransactionInterceptor } from '../interceptors/transaction.interceptor.js';
import { TransactionalOptions } from '../interfaces/transactional-options.interface.js';

export { TransactionalOptions };

export const TRANSACTIONAL_KEY = Symbol('Transactional');

/**
 * Decorator to wrap operations in a transaction.
 *
 * Can be applied at the class level (all methods) or method level.
 * Method-level settings override class-level settings.
 * Pass `false` to disable transactions for a specific method.
 *
 * @example
 * ```typescript
 * // Class-level: all routes are transactional
 * @Controller('orders')
 * @Transactional()
 * class OrderController {
 *   @Post()
 *   async create(@Ctx() ctx, @Body() dto) { ... }
 *
 *   // Override: disable transaction for this route
 *   @Get()
 *   @Transactional(false)
 *   async list(@Ctx() ctx) { ... }
 *
 *   // Override: read-only transaction for this route
 *   @Get(':id')
 *   @Transactional({ readOnly: true })
 *   async read(@Ctx() ctx) { ... }
 * }
 * ```
 */
export function Transactional(options?: TransactionalOptions | false) {
  // Explicit opt-out: set metadata to false so the runner skips this method
  if (options === false) {
    return SetMetadata(TRANSACTIONAL_KEY, false);
  }

  const resolvedOptions: TransactionalOptions = {
    readOnly: options?.readOnly ?? false,
    timeout: options?.timeout, // Let Transaction apply module default
  };

  return applyDecorators(
    SetMetadata(TRANSACTIONAL_KEY, resolvedOptions),
    UseInterceptors(TransactionInterceptor),
  );
}

/**
 * Resolve the `@Transactional()` metadata for the given targets, in order —
 * the first target that carries the metadata wins (e.g. a method overriding
 * its class). Returns `undefined` when none of the targets are decorated.
 *
 * `TRANSACTIONAL_KEY` itself stays unexported so consumers don't couple to
 * how this metadata is stored — read it through this function instead.
 */
export function getTransactionalOptions(
  ...targets: object[]
): TransactionalOptions | false | undefined {
  for (const target of targets) {
    const value: TransactionalOptions | false | undefined = Reflect.getMetadata(
      TRANSACTIONAL_KEY,
      target,
    );
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/**
 * Whether any of the given targets is effectively wrapped by
 * `@Transactional()` — `false` both when no target carries the metadata and
 * when the metadata explicitly opts out (`@Transactional(false)`).
 */
export function isTransactional(...targets: object[]): boolean {
  const options = getTransactionalOptions(...targets);
  return options !== undefined && options !== false;
}
