import {
  type EntityTarget,
  type FindOptionsOrder,
  type FindOptionsSelect,
} from 'typeorm';

import { type Type, type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';
import {
  type OrderClause,
  type RepositoryColumnMetadataInterface,
  type RepositoryRelationMetadataInterface,
} from '@concepta/nestjs-repository';

import { TypeOrmRelationMetadataException } from '../exceptions/typeorm-relation-metadata.exception.js';

import {
  type TypeOrmColumnMetadata,
  type TypeOrmJoinColumnMetadata,
  type TypeOrmRelationMetadata,
  type TypeOrmTableMetadata,
} from './typeorm-metadata.types.js';

/**
 * Type guard that validates EntityTarget satisfies Type<Entity>.
 */
export function isEntity<Entity extends PlainLiteralObject>(
  target: EntityTarget<Entity>,
): target is Type<Entity> {
  return typeof target === 'function' && target.prototype !== undefined;
}

/**
 * Build Entity from EntityTarget, throwing if invalid.
 */
export function buildEntity<Entity extends PlainLiteralObject>(
  target: EntityTarget<Entity>,
  entityName: string,
): Type<Entity> {
  if (!isEntity(target)) {
    throw new RuntimeException({
      message: 'Invalid entity for "%s": expected an entity class',
      messageParams: [entityName],
      fault: 'usage',
    });
  }
  return target;
}

/**
 * A relation as mapped from one side, before its target's columns and URN are
 * added.
 */
type MappedRelation = Omit<
  RepositoryRelationMetadataInterface,
  'targetColumns' | 'targetUrn'
>;

/**
 * The URN of the rows a table holds: `urn:typeorm:<database>:<table>`.
 *
 * The database is the table's own, else the connection's (as its driver
 * resolves it, from `database`, `url` or `replication`), and the table name
 * carries no schema. Every connection to one database names its tables alike;
 * two databases sharing a name and a table name collide, which the repository
 * treats as the same rows. An unknown database leaves its segment empty.
 */
export function buildUrn(
  table: TypeOrmTableMetadata,
  connection: string | undefined,
): string {
  return `urn:typeorm:${table.database ?? connection ?? ''}:${table.tableName}`;
}

/**
 * Map TypeORM column metadata to typed repository column metadata.
 *
 * A relation with no column of its own for its foreign key still gets a
 * column from TypeORM, named after the relation. It is not an own column, so
 * it is left out; the relation's `foreignKey` still names it.
 */
export function buildColumns<Entity extends PlainLiteralObject>(
  columns: readonly TypeOrmColumnMetadata[],
): RepositoryColumnMetadataInterface<Entity>[] {
  return columns
    .filter((col) => col.relationMetadata?.propertyName !== col.propertyName)
    .map((col) => {
      return {
        name: col.propertyName,
        isPrimary: col.isPrimary,
        isRemoveDate: col.isDeleteDate,
        isVersion: col.isVersion,
      };
    });
}

/**
 * Map TypeORM relation metadata to ORM-agnostic relation metadata.
 *
 * Handles owning/non-owning sides and M:N junction tables. Throws on a
 * relation it cannot map rather than leaving it out of the metadata.
 *
 * @param relations - TypeORM relation metadata array
 * @param database - the connection's database, for the relations' URNs
 */
export function buildRelations(
  relations: TypeOrmRelationMetadata[],
  database: string | undefined,
): RepositoryRelationMetadataInterface[] {
  return relations.map((rel) => {
    const relation = mapRelation(rel, database);
    if (!relation) {
      throw new TypeOrmRelationMetadataException(
        rel.propertyName,
        rel.inverseEntityMetadata.name,
      );
    }

    return {
      ...relation,
      targetUrn: buildUrn(rel.inverseEntityMetadata, database),
      targetColumns: buildColumns(rel.inverseEntityMetadata.columns),
    };
  });
}

/**
 * Determine cardinality from the perspective of the entity owning the property.
 */
function getCardinality(rel: TypeOrmRelationMetadata): 'one' | 'many' {
  if (rel.isOneToMany || rel.isManyToMany) return 'many';
  return 'one';
}

/**
 * Map a single TypeORM RelationMetadata to our agnostic format.
 * Returns undefined if required metadata is unavailable.
 */
function mapRelation(
  rel: TypeOrmRelationMetadata,
  database: string | undefined,
): MappedRelation | undefined {
  const name = rel.propertyName;
  const targetEntity = rel.inverseEntityMetadata.name;

  if (rel.isManyToMany) {
    return mapManyToMany(rel, name, targetEntity, database);
  }

  const cardinality = getCardinality(rel);

  if (rel.isOwning) {
    return mapOwning(rel, name, targetEntity, cardinality);
  }

  return mapNonOwning(rel, name, targetEntity, cardinality);
}

/**
 * Map an owning-side relation (many-to-one or one-to-one owner).
 * joinColumns live on the current entity.
 */
function mapOwning(
  rel: TypeOrmRelationMetadata,
  name: string,
  targetEntity: string,
  cardinality: 'one' | 'many',
): MappedRelation | undefined {
  const join = joinPairsOf(rel.joinColumns);
  if (!join) return undefined;

  return {
    name,
    targetEntity,
    cardinality,
    on: join.key,
    ...(join.pairs.length > 1 && { joinOn: join.pairs }),
    foreignKey: join.pairs,
  };
}

/**
 * Map a non-owning-side relation (one-to-many or one-to-one NOT owner).
 * Must look at the inverse relation's joinColumns and swap from/to.
 */
function mapNonOwning(
  rel: TypeOrmRelationMetadata,
  name: string,
  targetEntity: string,
  cardinality: 'one' | 'many',
): MappedRelation | undefined {
  const inverse = rel.inverseRelation;
  if (!inverse) return undefined;

  const join = joinPairsOf(inverse.joinColumns);
  if (!join) return undefined;

  // Swapped: our columns are what they reference, theirs are the join columns
  const swap = ({ from, to }: JoinPair): JoinPair => ({ from: to, to: from });
  const pairs = join.pairs.map(swap);

  return {
    name,
    targetEntity,
    cardinality,
    on: swap(join.key),
    ...(pairs.length > 1 && { joinOn: pairs }),
  };
}

interface JoinPair {
  from: string;
  to: string;
}

/**
 * Each join column paired with the column it references, from the owning
 * side, `key` first; `undefined` if there are none or a reference is missing.
 *
 * `key` is the first pair that references a primary key column, so for a
 * composite foreign key such as `(tenantId, orderId)` onto a primary key `id`,
 * it is `orderId` whatever order the columns are declared in. Onto another
 * unique key, it is the first pair listed.
 */
function joinPairsOf(
  joinColumns: readonly TypeOrmJoinColumnMetadata[],
): { pairs: JoinPair[]; key: JoinPair } | undefined {
  const primary: JoinPair[] = [];
  const others: JoinPair[] = [];

  for (const joinCol of joinColumns) {
    const referencedCol = joinCol.referencedColumn;
    if (!referencedCol) return undefined;

    const pair = { from: joinCol.propertyName, to: referencedCol.propertyName };
    (referencedCol.isPrimary ? primary : others).push(pair);
  }

  const pairs = [...primary, ...others];
  const [key] = pairs;
  return key && { pairs, key };
}

/**
 * Map a many-to-many relation (owning or non-owning side).
 * Junction table metadata provides through info.
 */
function mapManyToMany(
  rel: TypeOrmRelationMetadata,
  name: string,
  targetEntity: string,
  database: string | undefined,
): MappedRelation | undefined {
  if (rel.isManyToManyOwner) {
    return mapManyToManyOwner(rel, name, targetEntity, database);
  }
  return mapManyToManyNonOwner(rel, name, targetEntity, database);
}

/**
 * Map M:N owning side. joinColumns/inverseJoinColumns are junction columns.
 */
function mapManyToManyOwner(
  rel: TypeOrmRelationMetadata,
  name: string,
  targetEntity: string,
  database: string | undefined,
): MappedRelation | undefined {
  const junctionMeta = rel.junctionEntityMetadata;
  if (!junctionMeta) return undefined;

  const sourceJoinCol = rel.joinColumns[0];
  const targetJoinCol = rel.inverseJoinColumns[0];
  if (!sourceJoinCol || !targetJoinCol) return undefined;

  const sourceRef = sourceJoinCol.referencedColumn;
  const targetRef = targetJoinCol.referencedColumn;
  if (!sourceRef || !targetRef) return undefined;

  return {
    name,
    targetEntity,
    cardinality: 'many',
    on: {
      from: sourceRef.propertyName,
      to: targetRef.propertyName,
    },
    through: {
      urn: buildUrn(junctionMeta, database),
      fromKey: sourceJoinCol.propertyName,
      toKey: targetJoinCol.propertyName,
    },
  };
}

/**
 * Map M:N non-owning side. Must read from the inverse (owning) relation's
 * junction metadata, swapping source/target perspective.
 */
function mapManyToManyNonOwner(
  rel: TypeOrmRelationMetadata,
  name: string,
  targetEntity: string,
  database: string | undefined,
): MappedRelation | undefined {
  const inverse = rel.inverseRelation;
  if (!inverse) return undefined;

  const junctionMeta = inverse.junctionEntityMetadata;
  if (!junctionMeta) return undefined;

  // From the owner's perspective: joinColumns → owner, inverseJoinColumns → us
  const theirJoinCol = inverse.joinColumns[0];
  const ourJoinCol = inverse.inverseJoinColumns?.[0];
  if (!theirJoinCol || !ourJoinCol) return undefined;

  const ourRef = ourJoinCol.referencedColumn;
  const theirRef = theirJoinCol.referencedColumn;
  if (!ourRef || !theirRef) return undefined;

  return {
    name,
    targetEntity,
    cardinality: 'many',
    on: {
      from: ourRef.propertyName,
      to: theirRef.propertyName,
    },
    through: {
      urn: buildUrn(junctionMeta, database),
      fromKey: ourJoinCol.propertyName,
      toKey: theirJoinCol.propertyName,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OrderClause → TypeORM FindOptionsOrder
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard: validates a string is a valid TypeORM sort direction.
 */
export function isOrderValue(value: string): value is 'ASC' | 'DESC' {
  return value === 'ASC' || value === 'DESC';
}

/**
 * Build TypeORM FindOptionsOrder from an OrderClause.
 *
 * Preserves array order — JavaScript objects maintain insertion order
 * for string keys, which TypeORM uses to determine sort priority.
 *
 * Each entry is validated by {@link isOrderValue} during construction.
 */
export function buildOrder<Entity extends PlainLiteralObject>(
  keys: OrderClause<Entity>,
): FindOptionsOrder<Entity> | undefined {
  if (keys.length === 0) return undefined;

  const result: Record<string, string | Record<string, string>> = {};
  let hasEntries = false;

  for (const key of keys) {
    if (!isOrderValue(key.order)) {
      throw new RuntimeException({
        message: 'Cannot translate sort direction "%s" on "%s"',
        messageParams: [String(key.order), key.field],
        fault: 'internal',
      });
    }
    hasEntries = true;

    if (key.relation) {
      const existing = result[key.relation];
      const nested = typeof existing === 'object' ? existing : {};
      nested[key.field] = key.order;
      result[key.relation] = nested;
    } else {
      result[key.field] = key.order;
    }
  }

  if (!hasEntries) return undefined;

  return Object.assign<FindOptionsOrder<Entity>, typeof result>({}, result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Column list → TypeORM FindOptionsSelect
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build TypeORM FindOptionsSelect from a column list.
 *
 * The object form is the only shape TypeORM 1.x accepts; 0.3 also took a
 * string array and converted it to this object internally, so translating
 * here changes nothing on either line. Keys are top-level columns, so no
 * dotted-path nesting is attempted.
 *
 * An empty list yields `undefined`, which TypeORM reads as "all columns".
 */
export function buildSelect<Entity extends PlainLiteralObject>(
  keys: readonly (keyof Entity)[],
): FindOptionsSelect<Entity> | undefined {
  if (keys.length === 0) return undefined;

  const result: Record<string, boolean> = {};

  for (const key of keys) {
    result[String(key)] = true;
  }

  return Object.assign<FindOptionsSelect<Entity>, typeof result>({}, result);
}
