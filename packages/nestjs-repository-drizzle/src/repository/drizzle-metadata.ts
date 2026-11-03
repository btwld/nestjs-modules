import {
  type Column,
  getTableColumns,
  getTableUniqueName,
  is,
  type Table,
} from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';
import {
  type RepositoryColumnMetadataInterface,
  type RepositoryMetadataInterface,
} from '@concepta/nestjs-repository';

import { type DrizzleProviderOptionsInterface } from './drizzle-provider-options.interface.js';

/**
 * The table's own columns by property key.
 */
export function columnsOf(table: Table): Record<string, Column> {
  return getTableColumns(table);
}

/**
 * The column a table holds under `key`.
 */
export function columnOf(table: Table, key: string): Column {
  const column = columnsOf(table)[key];
  if (!column) {
    throw new RuntimeException({
      message: 'Table "%s" has no column "%s"',
      messageParams: [getTableUniqueName(table), key],
      fault: 'internal',
    });
  }
  return column;
}

/**
 * The URN of the rows a table holds: `urn:drizzle:<connection>:<table>`,
 * where the table is qualified by its schema when it has one.
 */
export function buildUrn(table: Table, connection: string): string {
  return `urn:drizzle:${connection}:${getTableUniqueName(table)}`;
}

/**
 * The own columns of a table, flagged by the registration that names its
 * soft-delete and version columns.
 */
export function buildColumns<Entity extends PlainLiteralObject>(
  table: Table,
  flags: Pick<DrizzleProviderOptionsInterface, 'removeDate' | 'version'>,
): RepositoryColumnMetadataInterface<Entity>[] {
  const primary = primaryKeysOf(table);
  return Object.keys(columnsOf(table)).map((key) => ({
    name: key,
    isPrimary: primary.includes(key),
    isRemoveDate: key === flags.removeDate,
    isVersion: key === flags.version,
  }));
}

/**
 * The keys of a table's primary key columns, whether declared on a column
 * or with `primaryKey()` in the table's config.
 */
function primaryKeysOf(table: Table): string[] {
  const declared = is(table, PgTable)
    ? getTableConfig(table).primaryKeys.flatMap(({ columns }) =>
        columns.map(({ name }) => name),
      )
    : [];
  return Object.entries(columnsOf(table))
    .filter(([, column]) => column.primary || declared.includes(column.name))
    .map(([key]) => key);
}

/**
 * The metadata a repository reports for one registration. The driver reports
 * no relations, so the repository refuses every read that joins one.
 */
export function buildMetadata<Entity extends PlainLiteralObject>(
  options: DrizzleProviderOptionsInterface<Entity>,
  connection: string,
): RepositoryMetadataInterface<Entity> {
  return {
    name: options.entity.name,
    type: options.entity,
    urn: buildUrn(options.table, connection),
    columns: buildColumns<Entity>(options.table, options),
  };
}
