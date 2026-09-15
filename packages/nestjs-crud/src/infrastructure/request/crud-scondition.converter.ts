import { BadRequestException, type PlainLiteralObject } from '@nestjs/common';

import { isObject } from '@concepta/nestjs-core';
import { Where, type WhereClause } from '@concepta/nestjs-repository';

import { sanitizeForMessage } from '../utils/validation.js';

import {
  COND_OPERATOR_FACTORY,
  CondOperator,
  type SCondition,
  type SFieldOperator,
} from './crud-query.types.js';
import { COMPARISON_OPERATORS } from './crud-query.validator.js';

/**
 * Converts SCondition search trees (from ?s= JSON query param)
 * into canonical WhereClause AST nodes.
 *
 * This is a pure mapping — no entity column validation.
 * Field validation should be performed separately by the consumer.
 */
export class SConditionConverter {
  private constructor() {}

  /**
   * Convert an SCondition tree to a single WhereClause, or undefined if empty.
   */
  static convert<T extends PlainLiteralObject>(
    search: SCondition<T>,
  ): WhereClause | undefined {
    const clauses = this.toWhereClauses(search);
    if (clauses.length === 0) return undefined;
    if (clauses.length === 1) return clauses[0];
    return Where.and(...clauses);
  }

  /**
   * Convert SCondition search tree to WhereClause array.
   */
  private static toWhereClauses<T extends PlainLiteralObject>(
    search?: SCondition<T>,
  ): WhereClause[] {
    if (!search || !isObject(search) || Object.keys(search).length === 0) {
      return [];
    }

    // Handle $and conditions
    if (search.$and && Array.isArray(search.$and) && search.$and.length) {
      const andBranches = search.$and.map((s) => this.toWhereClauses(s));
      const nonEmptyBranches = andBranches.filter((b) => b.length > 0);

      if (nonEmptyBranches.length === 0) {
        return [];
      }

      if (nonEmptyBranches.length === 1) {
        return nonEmptyBranches[0];
      }

      return [
        Where.and(
          ...nonEmptyBranches.map((branch) =>
            branch.length === 1 ? branch[0] : Where.or(...branch),
          ),
        ),
      ];
    }

    // Handle $or conditions
    if (search.$or && Array.isArray(search.$or) && search.$or.length) {
      const orConditions = search.$or.flatMap((s) => this.toWhereClauses(s));

      const keys = Object.keys(search);
      const otherKeys = keys.filter((k) => k !== '$or');
      if (otherKeys.length > 0) {
        const fieldClauses = this.fieldConditions(search);
        if (fieldClauses.length > 0 && orConditions.length > 0) {
          return [Where.and(...fieldClauses, Where.or(...orConditions))];
        }
        if (orConditions.length > 0) {
          return [Where.or(...orConditions)];
        }
        return fieldClauses;
      }

      if (orConditions.length === 0) {
        return [];
      }

      return [Where.or(...orConditions)];
    }

    // Simple field conditions
    return this.fieldConditions(search);
  }

  /**
   * Build WhereClause array from entity field values, ignoring $and/$or keys.
   */
  private static fieldConditions<T extends PlainLiteralObject>(
    search: SCondition<T>,
  ): WhereClause[] {
    const clauses: WhereClause[] = [];

    for (const field of Object.keys(search)) {
      if (field === '$and' || field === '$or') continue;

      const value = search[field];

      if (value === null || value === undefined) {
        clauses.push(Where.isNull(field));
      } else if (typeof value !== 'object') {
        clauses.push(Where.eq(field, value));
      } else if (!Array.isArray(value)) {
        clauses.push(...this.fieldOperators(field, value));
      }
    }

    return clauses;
  }

  /**
   * Convert a field's SFieldOperator to WhereClause[].
   * Multiple operators on the same field produce an AND compound.
   */
  private static fieldOperators(
    field: string,
    operators: SFieldOperator,
  ): WhereClause[] {
    const conditions: WhereClause[] = [];

    for (const key of COMPARISON_OPERATORS) {
      if (key in operators) {
        conditions.push(this.mapCondOperator(field, key, operators[key]));
      }
    }

    // Handle nested $or — e.g. { $or: { $null: true, $eq: 1 } }
    if (operators.$or) {
      const orOperators = operators.$or;
      const orConditions: WhereClause[] = [];
      for (const key of COMPARISON_OPERATORS) {
        if (key in orOperators) {
          orConditions.push(this.mapCondOperator(field, key, orOperators[key]));
        }
      }
      if (orConditions.length === 1) {
        conditions.push(orConditions[0]);
      } else if (orConditions.length > 1) {
        if (conditions.length === 0) {
          return [Where.or(...orConditions)];
        }
        return [Where.and(...conditions, Where.or(...orConditions))];
      }
    }

    if (conditions.length === 0) {
      throw new BadRequestException('Empty filter operator object');
    }

    if (conditions.length === 1) {
      return [conditions[0]];
    }

    return [Where.and(...conditions)];
  }

  /**
   * Map a CondOperator ($-prefixed) to a WhereClause.
   * Validates array/pair inputs before delegating to the shared factory.
   */
  private static mapCondOperator(
    field: string,
    operator: CondOperator,
    value: unknown,
  ): WhereClause {
    if (
      (operator === CondOperator.IN || operator === CondOperator.NOT_IN) &&
      !Array.isArray(value)
    ) {
      throw new BadRequestException(
        `${sanitizeForMessage(operator)} requires array`,
      );
    }

    if (operator === CondOperator.BETWEEN) {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new BadRequestException(
          'BETWEEN operator requires an array with two elements',
        );
      }
    }

    const factory = COND_OPERATOR_FACTORY[operator];

    if (!factory) {
      throw new BadRequestException(
        `Unknown filter operator '${sanitizeForMessage(operator)}'`,
      );
    }

    return factory(field, value);
  }
}
