import {
  type Column,
  getTableColumns,
  getTableName,
  getTableUniqueName,
  is,
  type Table,
} from 'drizzle-orm';
import {
  getTableConfig as getMysqlTableConfig,
  MySqlTable,
} from 'drizzle-orm/mysql-core';
import {
  getTableConfig as getPgTableConfig,
  PgTable,
} from 'drizzle-orm/pg-core';
import {
  getTableConfig as getSqliteTableConfig,
  SQLiteTable,
} from 'drizzle-orm/sqlite-core';

import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';
import {
  type RepositoryColumnMetadataInterface,
  type RepositoryMetadataInterface,
} from '@concepta/nestjs-repository';

import { type DrizzleProviderOptionsInterface } from './drizzle-provider-options.interface.js';

/**
 * The column a table holds under `key`, as its dialect's column.
 */
export function columnOf<C extends Column>(
  table: Table & { _: { columns: Record<string, C> } },
  key: string,
): C {
  const column = getTableColumns(table)[key];
  if (column === undefined) {
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
  const schema = is(table, PgTable)
    ? getPgTableConfig(table).schema
    : is(table, MySqlTable)
      ? getMysqlTableConfig(table).schema
      : undefined;
  const name = getTableName(table);
  return `urn:drizzle:${connection}:${schema ? `${schema}.${name}` : name}`;
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
  return Object.keys(getTableColumns(table)).map((key) => ({
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
  const primaryKeys = is(table, PgTable)
    ? getPgTableConfig(table).primaryKeys
    : is(table, MySqlTable)
      ? getMysqlTableConfig(table).primaryKeys
      : is(table, SQLiteTable)
        ? getSqliteTableConfig(table).primaryKeys
        : [];
  const declared = primaryKeys.flatMap(({ columns }) =>
    columns.map(({ name }) => name),
  );
  return Object.entries(getTableColumns(table))
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
