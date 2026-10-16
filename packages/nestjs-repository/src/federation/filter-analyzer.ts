import { HttpStatus, type PlainLiteralObject } from '@nestjs/common';

import {
  type WhereClause,
  type WhereCondition,
  isWhereCondition,
  isWhereCompound,
} from '../repository/interfaces/where-clause.interface.js';
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../repository/repository.types.js';

import { FederationException } from './exceptions/federation.exception.js';
import { type FederatedRelation } from './federation.types.js';

/**
 * Separates a WhereClause tree into root conditions and
 * relation-tagged conditions grouped by relation name.
 *
 * Also injects NOT_NULL filters for sorted relations
 * and applies distinctFilter from relation metadata.
 */
export class FilterAnalyzer {
  private rootWhere: WhereClause | undefined;
  private readonly relationConditions = new Map<
    string,
    WhereCondition<PlainLiteralObject>[]
  >();

  constructor(
    where: WhereClause | undefined,
    relations: FederatedRelation[],
    sortedRelationNames: Set<string>,
  ) {
    const federatedNames = new Set(relations.map((r) => r.name));
    this.rootWhere = this.extractRelationConditions(where, federatedNames);

    if (relations.length > 0) {
      this.injectSortedRelationFilters(relations, sortedRelationNames);
      this.injectDistinctFilters(relations);
    }
  }

  /** Root WhereClause with relation-tagged conditions removed. */
  getRootWhere(): WhereClause | undefined {
    return this.rootWhere;
  }

  /** Get extracted conditions for a specific relation. */
  getRelationConditions(
    relation: FederatedRelation,
  ): readonly WhereCondition<PlainLiteralObject>[] {
    return this.relationConditions.get(relation.name) ?? [];
  }

  /** Whether the given relation has any extracted filter conditions. */
  hasFiltersForRelation(relation: FederatedRelation): boolean {
    const conditions = this.relationConditions.get(relation.name);
    return conditions !== undefined && conditions.length > 0;
  }

  hasRelationFilters(relations: FederatedRelation[]): boolean {
    return relations.some((r) => this.hasFiltersForRelation(r));
  }

  /** Build a constraint WhereCondition for IN/EQ on a field. */
  static buildConstraint(
    field: string,
    values: unknown[],
  ): WhereCondition<PlainLiteralObject> | undefined {
    if (values.length === 0) return undefined;
    if (values.length === 1) {
      return { field, operator: WhereOperator.EQ, value: values[0] };
    }
    return { field, operator: WhereOperator.IN, value: values };
  }

  /** Build a WhereClause from a flat array of AND conditions. */
  static buildWhereClause(
    conditions: WhereCondition<PlainLiteralObject>[],
  ): WhereClause | undefined {
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { operator: WhereCompoundOperator.AND, conditions };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Tree extraction
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Walk the WhereClause tree and extract relation-tagged conditions.
   * Returns the pruned tree with those conditions removed.
   *
   * Throws if a relation-tagged condition appears inside an OR compound.
   */
  private extractRelationConditions(
    clause: WhereClause | undefined,
    federatedNames: Set<string>,
  ): WhereClause | undefined {
    if (!clause) return undefined;
    return this.filterClause(clause, federatedNames, false);
  }

  private filterClause(
    clause: WhereClause,
    federatedNames: Set<string>,
    insideOr: boolean,
  ): WhereClause | undefined {
    if (isWhereCondition(clause)) {
      if (clause.relation && federatedNames.has(clause.relation)) {
        if (insideOr) {
          throw new FederationException({
            message:
              'OR conditions on federated relation "%s" are not supported',
            messageParams: [clause.relation],
            httpStatus: HttpStatus.BAD_REQUEST,
            fault: 'client',
          });
        }
        this.addRelationCondition(clause.relation, clause);
        return undefined;
      }
      return clause;
    }

    if (!isWhereCompound(clause)) return clause;

    const isOr = clause.operator === WhereCompoundOperator.OR;
    const kept: WhereClause[] = [];

    for (const child of clause.conditions) {
      const filtered = this.filterClause(
        child,
        federatedNames,
        insideOr || isOr,
      );
      if (filtered) kept.push(filtered);
    }

    if (kept.length === 0) return undefined;
    if (kept.length === 1) return kept[0];
    return { operator: clause.operator, conditions: kept };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Condition injection
  // ═══════════════════════════════════════════════════════════════════

  private addRootCondition(
    condition: WhereCondition<PlainLiteralObject>,
  ): void {
    if (!this.rootWhere) {
      this.rootWhere = condition;
    } else {
      this.rootWhere = {
        operator: WhereCompoundOperator.AND,
        conditions: [this.rootWhere, condition],
      };
    }
  }

  private addRelationCondition(
    relationName: string,
    condition: WhereCondition<PlainLiteralObject>,
  ): void {
    let conditions = this.relationConditions.get(relationName);
    if (!conditions) {
      conditions = [];
      this.relationConditions.set(relationName, conditions);
    }
    conditions.push(condition);
  }

  /**
   * Inject NOT_NULL filters for sorted relations.
   *
   * Owning: NOT_NULL on root's FK column (added to root where).
   * Non-owning: NOT_NULL on target's FK column (added to relation conditions).
   */
  private injectSortedRelationFilters(
    relations: FederatedRelation[],
    sortedRelationNames: Set<string>,
  ): void {
    const sorted = relations.filter((r) => sortedRelationNames.has(r.name));

    for (const relation of sorted) {
      if (relation.isOwning) {
        this.addRootCondition({
          field: relation.on.from,
          operator: WhereOperator.NOT_NULL,
        });
      } else {
        this.addRelationCondition(relation.name, {
          field: relation.on.to,
          operator: WhereOperator.NOT_NULL,
          relation: relation.name,
        });
      }
    }
  }

  /** Add distinctFilter conditions from relation metadata. */
  private injectDistinctFilters(relations: FederatedRelation[]): void {
    for (const relation of relations) {
      if (relation.distinctFilter) {
        this.addRelationCondition(relation.name, {
          ...relation.distinctFilter,
          relation: relation.name,
        });
      }
    }
  }
}
