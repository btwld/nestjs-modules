import { type EntityTarget, type FindOptionsOrder } from 'typeorm';

import { type Type, type PlainLiteralObject } from '@nestjs/common';

import {
  type OrderClause,
  type RepositoryColumnMetadataInterface,
  type RepositoryRelationMetadataInterface,
  type RelationActionConfig,
} from '@concepta/nestjs-repository';

import {
  type TypeOrmColumnMetadata,
  type TypeOrmRelationMetadata,
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
    throw new Error(`Invalid entity for "${entityName}"`);
  }
  return target;
}

/**
 * Map TypeORM column metadata to typed repository column metadata.
 */
export function buildColumns<Entity extends PlainLiteralObject>(
  columns: TypeOrmColumnMetadata[],
): RepositoryColumnMetadataInterface<Entity>[] {
  return columns.map((col) => {
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
 * Handles owning/non-owning sides and M:N junction tables.
 * Skips relations where required FK metadata is unavailable.
 *
 * @param relations - TypeORM relation metadata array
 * @param relationsConfig - optional per-relation action config from forFeature()
 */
export function buildRelations(
  relations: TypeOrmRelationMetadata[],
  relationsConfig?: Record<string, RelationActionConfig>,
): RepositoryRelationMetadataInterface[] {
  const result: RepositoryRelationMetadataInterface[] = [];

  for (const rel of relations) {
    const mapped = mapRelation(rel);
    if (mapped) {
      const cfg = relationsConfig?.[mapped.name];
      result.push(
        cfg
          ? {
              ...mapped,
              onDelete: cfg.onDelete,
              onUpdate: cfg.onUpdate,
              federated: cfg.federated,
              distinctFilter: cfg.distinctFilter,
            }
          : mapped,
      );
    }
  }

  return result;
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
): RepositoryRelationMetadataInterface | undefined {
  const name = rel.propertyName;
  const targetEntity = rel.inverseEntityMetadata.name;

  if (rel.isManyToMany) {
    return mapManyToMany(rel, name, targetEntity);
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
): RepositoryRelationMetadataInterface | undefined {
  const joinCol = rel.joinColumns[0];
  if (!joinCol) return undefined;

  const referencedCol = joinCol.referencedColumn;
  if (!referencedCol) return undefined;

  return {
    name,
    targetEntity,
    cardinality,
    on: {
      from: joinCol.propertyName,
      to: referencedCol.propertyName,
    },
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
): RepositoryRelationMetadataInterface | undefined {
  const inverse = rel.inverseRelation;
  if (!inverse) return undefined;

  const inverseJoinCol = inverse.joinColumns[0];
  if (!inverseJoinCol) return undefined;

  const referencedCol = inverseJoinCol.referencedColumn;
  if (!referencedCol) return undefined;

  // Swapped: our PK is what they reference, their FK is the join column
  return {
    name,
    targetEntity,
    cardinality,
    on: {
      from: referencedCol.propertyName,
      to: inverseJoinCol.propertyName,
    },
  };
}

/**
 * Map a many-to-many relation (owning or non-owning side).
 * Junction table metadata provides through info.
 */
function mapManyToMany(
  rel: TypeOrmRelationMetadata,
  name: string,
  targetEntity: string,
): RepositoryRelationMetadataInterface | undefined {
  if (rel.isManyToManyOwner) {
    return mapManyToManyOwner(rel, name, targetEntity);
  }
  return mapManyToManyNonOwner(rel, name, targetEntity);
}

/**
 * Map M:N owning side. joinColumns/inverseJoinColumns are junction columns.
 */
function mapManyToManyOwner(
  rel: TypeOrmRelationMetadata,
  name: string,
  targetEntity: string,
): RepositoryRelationMetadataInterface | undefined {
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
      relation: junctionMeta.name,
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
): RepositoryRelationMetadataInterface | undefined {
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
      relation: junctionMeta.name,
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
    if (!isOrderValue(key.order)) continue;
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
