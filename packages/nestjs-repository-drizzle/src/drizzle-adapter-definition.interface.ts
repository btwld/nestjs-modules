import { type PlainLiteralObject, type Type } from '@nestjs/common';

import {
  type RepositoryAdapter,
  type TransactionFactoryInterface,
} from '@concepta/nestjs-repository';

import { type DrizzleRepositoryOptions } from './repository/drizzle-repository-options.interface.js';

/**
 * What one database's adapter gives the shared registration: its module
 * class, its transaction keys, the database it accepts, and how to build its
 * repositories and transaction factories from the registration's `options`.
 */
export interface DrizzleAdapterDefinitionInterface<
  Client,
  Options = undefined,
> {
  /** The adapter's module class. */
  module: Type;

  /**
   * Prefixes each connection's transaction key, e.g. `'drizzle-postgres'`
   * for `'drizzle-postgres:default'`.
   */
  transactionKeyPrefix: string;

  /**
   * The database `@nestjs/drizzle` registered for `connection`, or a
   * refusal when it is not one this adapter is for.
   */
  toClient(db: unknown, connection: string): Client;

  /** Build the adapter's repository for one registration. */
  createRepository<Entity extends PlainLiteralObject>(
    options: DrizzleRepositoryOptions<Entity, Client>,
  ): RepositoryAdapter<Entity>;

  /** Build the adapter's transaction factory for one connection. */
  createTransactionFactory(
    db: Client,
    connection: string,
    driverOptions?: Options,
  ): TransactionFactoryInterface;
}
