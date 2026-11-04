import { type Table } from 'drizzle-orm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type HookResolverService } from '@concepta/nestjs-core';
import { type RepositoryMetadataInterface } from '@concepta/nestjs-repository';

/**
 * What a Drizzle repository is built with: one registration, the database of
 * its connection, and what it reports about the table.
 */
export interface DrizzleRepositoryOptions<
  Entity extends PlainLiteralObject,
  Client,
> {
  entityKey: string;
  /** The `@nestjs/drizzle` connection the registration names. */
  connection: string;
  db: Client;
  table: Table;
  metadata: RepositoryMetadataInterface<Entity>;
  transactionKey?: string;
  hookResolver?: HookResolverService;
}
