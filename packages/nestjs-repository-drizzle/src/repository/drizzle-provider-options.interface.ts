import { type Table } from 'drizzle-orm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryProviderOptions } from '@concepta/nestjs-repository';

/**
 * How one entity is registered with the Drizzle driver: its class, the table
 * its rows live in, and the columns Drizzle has no notion of.
 */
export interface DrizzleProviderOptionsInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends RepositoryProviderOptions<Entity> {
  /** The table this entity's rows live in. */
  table: Table;

  /**
   * The `@nestjs/drizzle` connection the table lives in. The default
   * connection when absent.
   */
  connection?: string;

  /** The column holding the date a row was soft deleted, if any. */
  removeDate?: keyof Entity & string;

  /** The column holding the row's version, if any. */
  version?: keyof Entity & string;
}
