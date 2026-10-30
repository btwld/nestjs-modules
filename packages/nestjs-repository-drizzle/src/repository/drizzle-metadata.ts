import {
  type AnyRelations,
  type Column,
  getColumns,
  getTableUniqueName,
  is,
  type Relation,
  type RelationsBuilderColumnBase,
  type SchemaEntry,
  Table,
} from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';
import {
  type RepositoryColumnMetadataInterface,
  type RepositoryMetadataInterface,
  type RepositoryRelationMetadataInterface,
} from '@concepta/nestjs-repository';

import { type DrizzleProviderOptionsInterface } from './drizzle-provider-options.interface.js';

/** A column pair a relation matches rows by: mine, then theirs. */
export interface DrizzleJoinPair {
  from: string;
  to: string;
}

/**
 * A relation as the driver joins it: the reported metadata, plus the tables
 * it reads.
 */
export interface DrizzleRelation {
  metadata: RepositoryRelationMetadataInterface;
  target: Table;
  /** The target's soft-delete column, as its registration names it. */
  targetRemoveDate?: string;
  /** Every column pair a direct relation matches. */
  pairs: DrizzleJoinPair[];
  /** The junction of a many-to-many relation. */
  through?: { table: Table; fromKey: string; toKey: string };
}

/**
 * The table's own columns by property key.
 */
export function columnsOf(table: Table): Record<string, Column> {
  return getColumns(table);
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

function isTable(entry: SchemaEntry | undefined): entry is Table {
  return is(entry, Table);
}

function keysOf(columns: RelationsBuilderColumnBase[]): string[] {
  return columns.map((column) => column._.key);
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

/** The key of a table's primary key column, when it has exactly one. */
function primaryKeyOf(table: Table): string | undefined {
  const [key, ...others] = primaryKeysOf(table);
  return others.length === 0 ? key : undefined;
}

/**
 * Every relation `table` declares in the database's relations config, as
 * the driver joins it. A relation is reported only when its target is
 * registered with this driver on the same connection: the soft-delete column
 * of any other table is unknown, so it could not be joined faithfully.
 *
 * A relation that carries its own filter is refused: every read of it would
 * be narrowed by a condition the repository never asked for.
 */
export function buildRelations(
  table: Table,
  relations: AnyRelations,
  registered: DrizzleProviderOptionsInterface[],
  connection: string,
): DrizzleRelation[] {
  const config = Object.values(relations).find(
    (entry) => entry.table === table,
  );
  if (!config) return [];

  const result: DrizzleRelation[] = [];

  for (const [name, relation] of Object.entries<Relation>(config.relations)) {
    const targetTable = relation.targetTable;
    if (!isTable(targetTable)) continue;

    const target = registered.find((entry) => entry.table === targetTable);
    if (!target) continue;

    if (typeof relation.where === 'object' && relation.where !== null) {
      throw new RuntimeException({
        message:
          'Relation "%s" of table "%s" declares its own filter, which the ' +
          'Drizzle repository driver does not apply',
        messageParams: [name, getTableUniqueName(table)],
        fault: 'usage',
      });
    }

    result.push(
      mapRelation(name, relation, table, targetTable, target, connection),
    );
  }

  return result;
}

function mapRelation(
  name: string,
  relation: Relation,
  table: Table,
  targetTable: Table,
  target: DrizzleProviderOptionsInterface,
  connection: string,
): DrizzleRelation {
  const from = keysOf(relation.sourceColumns);
  const to = keysOf(relation.targetColumns);
  const base = {
    name,
    targetEntity: target.entity.name,
    targetUrn: buildUrn(targetTable, connection),
    targetColumns: buildColumns(targetTable, target),
    cardinality: relation.relationType,
  };

  const { through, throughTable } = relation;
  if (through && throughTable && isTable(throughTable)) {
    // A junction is reported by one column on each side.
    const pairs = zip(from, to);
    const sources = keysOf(through.source);
    const targets = keysOf(through.target);
    const [on] = pairs;
    const [fromKey] = sources;
    const [toKey] = targets;
    if (
      !on ||
      !fromKey ||
      !toKey ||
      pairs.length > 1 ||
      sources.length > 1 ||
      targets.length > 1
    ) {
      throw unmappable(name, table);
    }
    return {
      metadata: {
        ...base,
        on,
        through: {
          urn: buildUrn(throughTable, connection),
          fromKey,
          toKey,
        },
      },
      target: targetTable,
      targetRemoveDate: target.removeDate,
      pairs: [on],
      through: { table: throughTable, fromKey, toKey },
    };
  }

  const pairs = zip(from, to);
  const targetKey = primaryKeyOf(targetTable);
  const sourceKey = primaryKeyOf(table);
  // A to-one relation onto the target's primary key holds the foreign key.
  const owning =
    relation.relationType === 'one' &&
    pairs.some((pair) => pair.to === targetKey);
  const on =
    pairs.find((pair) => (owning ? pair.to === targetKey : false)) ??
    pairs.find((pair) => pair.from === sourceKey) ??
    pairs[0];
  if (!on) {
    throw unmappable(name, table);
  }

  return {
    metadata: {
      ...base,
      on,
      ...(pairs.length > 1 && { joinOn: pairs }),
      ...(owning && { foreignKey: pairs }),
    },
    target: targetTable,
    targetRemoveDate: target.removeDate,
    pairs,
  };
}

function zip(from: string[], to: string[]): DrizzleJoinPair[] {
  return from.flatMap((key, index) => {
    const other = to[index];
    return other === undefined ? [] : [{ from: key, to: other }];
  });
}

function unmappable(name: string, table: Table): RuntimeException {
  return new RuntimeException({
    message: 'Cannot map relation "%s" of table "%s"',
    messageParams: [name, getTableUniqueName(table)],
    fault: 'usage',
  });
}

/**
 * The metadata a repository reports for one registration.
 */
export function buildMetadata<Entity extends PlainLiteralObject>(
  options: DrizzleProviderOptionsInterface<Entity>,
  relations: DrizzleRelation[],
  connection: string,
): RepositoryMetadataInterface<Entity> {
  return {
    name: options.entity.name,
    type: options.entity,
    urn: buildUrn(options.table, connection),
    columns: buildColumns<Entity>(options.table, options),
    relations: relations.map(({ metadata }) => metadata),
  };
}
