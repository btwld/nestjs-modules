import { type TransactionalOptions } from '@concepta/nestjs-repository';

export interface CrudTransactionalInterface {
  /**
   * Enable transactions for write operations.
   *
   * When `true`, applies `@Transactional()` with default options.
   * When an options object, applies `@Transactional(options)`.
   * When `false` or omitted, no transaction decorator is applied.
   *
   * On controller options: applies to all write operations (Create, Update, Replace, Delete, etc.)
   * On operation options: overrides the controller-level setting for that operation.
   */
  transactional?: boolean | TransactionalOptions;
}
