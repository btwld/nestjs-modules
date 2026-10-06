import { type PlainLiteralObject } from '@nestjs/common';

import {
  type FederatedRelation,
  type RelationResult,
} from './federation.types.js';

/**
 * Hydrate relations on root entities by matching FK columns.
 *
 * For each relation result, assigns target entities to root entities
 * based on the `on.from` (root column) and `on.to` (target column) mapping.
 */
export function hydrateRelations<Entity extends PlainLiteralObject>(
  roots: Entity[],
  rootPrimaryKey: string,
  relationResults: RelationResult[],
): void {
  if (roots.length === 0 || relationResults.length === 0) return;

  // Build root lookup by primary key
  const rootMap = new Map<unknown, Entity>();
  for (const root of roots) {
    rootMap.set(root[rootPrimaryKey], root);
  }

  for (const result of relationResults) {
    const relation = result.relation;

    if (relation.isOwning) {
      hydrateOwning(roots, relation, result.data);
    } else {
      hydrateNonOwning(rootMap, relation, result.data);
    }
  }

  // Fill in missing relation properties with defaults
  const allRelations = relationResults.map((r) => r.relation);
  initializeEmptyRelations(roots, allRelations, true);
}

/**
 * Hydrate owning relation: root[on.from] → target[on.to].
 * Root holds the FK, target holds the PK.
 */
function hydrateOwning<Entity extends PlainLiteralObject>(
  roots: Entity[],
  relation: FederatedRelation,
  targets: PlainLiteralObject[],
): void {
  if (relation.cardinality === 'many') {
    // Group targets by their key column (target PK)
    const grouped = groupBy(targets, relation.on.to);

    for (const root of roots) {
      const fk = root[relation.on.from];
      if (fk != null) {
        setProperty(root, relation.name, grouped.get(fk) ?? []);
      }
    }
  } else {
    // Single target lookup
    const byKey = new Map<unknown, PlainLiteralObject>();
    for (const target of targets) {
      byKey.set(target[relation.on.to], target);
    }

    for (const root of roots) {
      const fk = root[relation.on.from];
      if (fk != null) {
        const target = byKey.get(fk);
        if (target) setProperty(root, relation.name, target);
      }
    }
  }
}

/**
 * Hydrate non-owning relation: target[on.to] → root[on.from].
 * Target holds the FK pointing to root's PK.
 */
function hydrateNonOwning<Entity extends PlainLiteralObject>(
  rootMap: Map<unknown, Entity>,
  relation: FederatedRelation,
  targets: PlainLiteralObject[],
): void {
  // Group targets by the root key they reference
  const grouped = groupBy(targets, relation.on.to);

  for (const [rootKeyValue, groupedTargets] of grouped) {
    const root = rootMap.get(rootKeyValue);
    if (!root) continue;

    if (relation.cardinality === 'one') {
      setProperty(root, relation.name, groupedTargets[0] ?? null);
    } else {
      setProperty(root, relation.name, groupedTargets);
    }
  }
}

/**
 * Initialize relation properties with empty defaults (null or []).
 */
export function initializeEmptyRelations<Entity extends PlainLiteralObject>(
  roots: Entity[],
  relations: FederatedRelation[],
  onlyIfMissing = false,
): void {
  for (const root of roots) {
    for (const relation of relations) {
      if (!onlyIfMissing || !(relation.name in root)) {
        const defaultValue = relation.cardinality === 'one' ? null : [];
        setProperty(root, relation.name, defaultValue);
      }
    }
  }
}

function groupBy(
  items: PlainLiteralObject[],
  key: string,
): Map<unknown, PlainLiteralObject[]> {
  const map = new Map<unknown, PlainLiteralObject[]>();
  for (const item of items) {
    const value = item[key];
    let group = map.get(value);
    if (!group) {
      group = [];
      map.set(value, group);
    }
    group.push(item);
  }
  return map;
}

function setProperty(
  entity: PlainLiteralObject,
  name: string,
  value: unknown,
): void {
  entity[name] = value;
}
