import { HttpStatus } from '@nestjs/common';

import {
  type OrderClause,
  type OrderSortKey,
} from '../repository/repository.types.js';

import { FederationException } from './exceptions/federation.exception.js';
import {
  type FederatedRelation,
  FederationStrategy,
} from './federation.types.js';
import { type FilterAnalyzer } from './filter-analyzer.js';
import { type ExecutionAnalysis } from './interfaces/execution-analysis.interface.js';

export { ExecutionAnalysis } from './interfaces/execution-analysis.interface.js';

/**
 * Analyze the query to determine execution strategy and separate
 * root vs relation order sort keys.
 *
 * Strategy selection:
 * - ROOT_FIRST: No relation sorts or filters. Fetch roots, then enrich.
 * - RELATION_FIRST: Has relation sorts or filters. Discover root IDs
 *   via relation queries first, then fetch matching roots.
 */
export function analyzeExecution(
  filterAnalyzer: FilterAnalyzer,
  order: OrderClause | undefined,
  relations: FederatedRelation[],
): ExecutionAnalysis {
  const { rootOrder, relationOrders, sortedRelationNames, drivingRelation } =
    separateOrder(order, relations);

  validateRelationSorts(sortedRelationNames, relations);
  validateNoOwningRelationConstraints(
    relations,
    sortedRelationNames,
    filterAnalyzer,
  );

  // Driving relation: first with sort, then first with filter
  const effectiveDrivingRelation =
    drivingRelation ??
    relations.find((r) => filterAnalyzer.hasFiltersForRelation(r));

  // A many-cardinality relation chosen to drive discovery purely by a
  // caller-specified filter (not a sort — that's covered by
  // validateRelationSorts above) reports its total from matching child
  // rows, not distinct root ids, unless distinctFilter narrows it to one
  // row per root. Structural NOT_NULL injection alone doesn't trigger
  // this — see FilterAnalyzer.hasUserFiltersForRelation.
  if (
    !drivingRelation &&
    effectiveDrivingRelation &&
    effectiveDrivingRelation.cardinality === 'many' &&
    !effectiveDrivingRelation.distinctFilter &&
    filterAnalyzer.hasUserFiltersForRelation(effectiveDrivingRelation)
  ) {
    throw new FederationException({
      message:
        'Filtering on many-cardinality relation "%s" requires distinctFilter configuration',
      messageParams: [effectiveDrivingRelation.name],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });
  }

  const hasRelationSorts = sortedRelationNames.size > 0;
  const hasRelationFilters = filterAnalyzer.hasRelationFilters(relations);

  const strategy =
    hasRelationSorts || hasRelationFilters
      ? FederationStrategy.RELATION_FIRST
      : FederationStrategy.ROOT_FIRST;

  return {
    strategy,
    rootOrder,
    relationOrders,
    drivingRelation: effectiveDrivingRelation,
    sortedRelationNames,
    filterAnalyzer,
  };
}

/**
 * Separate OrderClause into root vs relation parts.
 *
 * Sort keys whose `relation` matches a federated relation name
 * are extracted as relation orders. Everything else is a root order.
 */
function separateOrder(
  order: OrderClause | undefined,
  relations: FederatedRelation[],
): {
  rootOrder: OrderClause | undefined;
  relationOrders: Map<string, OrderClause>;
  sortedRelationNames: Set<string>;
  drivingRelation: FederatedRelation | undefined;
} {
  if (!order || order.length === 0) {
    return {
      rootOrder: undefined,
      relationOrders: new Map(),
      sortedRelationNames: new Set(),
      drivingRelation: undefined,
    };
  }

  const relationsByName = new Map(relations.map((r) => [r.name, r]));
  const rootKeys: OrderSortKey[] = [];
  const relationOrders = new Map<string, OrderSortKey[]>();
  const sortedRelationNames = new Set<string>();
  let drivingRelation: FederatedRelation | undefined;

  for (const key of order) {
    const relation = key.relation
      ? relationsByName.get(key.relation)
      : undefined;

    if (relation && key.relation) {
      const arr = relationOrders.get(key.relation) ?? [];
      arr.push(key);
      relationOrders.set(key.relation, arr);
      sortedRelationNames.add(key.relation);
      if (!drivingRelation) drivingRelation = relation;
    } else {
      rootKeys.push(key);
    }
  }

  return {
    rootOrder: rootKeys.length > 0 ? rootKeys : undefined,
    relationOrders,
    sortedRelationNames,
    drivingRelation,
  };
}

/**
 * Reject filtering or sorting on an owning relation (root FK \> target PK).
 *
 * RELATION_FIRST discovery only chains non-owning relations — an owning
 * relation's target rows carry no root id to extract, so it can't drive
 * discovery. Without this check, a filter/sort on an owning-only relation
 * set silently produces an empty discovery batch and returns `[[], 0]` as
 * if nothing matched, rather than failing loudly.
 */
function validateNoOwningRelationConstraints(
  relations: FederatedRelation[],
  sortedRelationNames: Set<string>,
  filterAnalyzer: FilterAnalyzer,
): void {
  for (const relation of relations) {
    if (!relation.isOwning) continue;

    if (
      sortedRelationNames.has(relation.name) ||
      filterAnalyzer.hasFiltersForRelation(relation)
    ) {
      throw new FederationException({
        message:
          'Filtering or sorting on owning federated relation "%s" is not supported',
        messageParams: [relation.name],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }
  }
}

/**
 * Validate that many-cardinality relations being sorted have distinctFilter.
 */
function validateRelationSorts(
  sortedRelationNames: Set<string>,
  relations: FederatedRelation[],
): void {
  for (const name of sortedRelationNames) {
    const relation = relations.find((r) => r.name === name);
    if (
      relation &&
      relation.cardinality === 'many' &&
      !relation.distinctFilter
    ) {
      throw new FederationException({
        message:
          'Sorting on many-cardinality relation "%s" requires distinctFilter configuration',
        messageParams: [name],
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      });
    }
  }
}
