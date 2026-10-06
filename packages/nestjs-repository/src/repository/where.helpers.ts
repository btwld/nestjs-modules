import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import {
  type WhereClause,
  type WhereCompound,
  type WhereCondition,
  type WhereConditionArray,
  type WhereConditionNullary,
  type WhereConditionPair,
  type WhereConditionScalar,
  type WhereNever,
} from './interfaces/where-clause.interface.js';
import {
  type EntityColumn,
  WhereCompoundOperator,
  WhereOperator,
} from './repository.types.js';

// A single frozen instance, so the builder never allocates and the node
// cannot be mutated in place. Consumers recognize it structurally
// (`isWhereNever`), not by reference, so a hand-built `{ never: true }` is
// treated identically.
const NEVER: WhereNever = Object.freeze({ never: true });

/**
 * Where clause builder with both static and instance APIs.
 *
 * @example Static usage (pass Entity as generic per call):
 * ```typescript
 * repository.findOne(Where.where(Where.eq<User>('id', userId)));
 * repository.find(Where.where(Where.and(Where.eq<User>('status', 'active'), Where.gt<User>('age', 18))));
 * ```
 *
 * @example Typed builder (Entity bound via factory):
 * ```typescript
 * const w = Where.for<User>();
 * repository.find(w.where(w.and(w.eq('status', 'active'), w.gt('age', 18))));
 * ```
 */
export class Where<Entity extends PlainLiteralObject = PlainLiteralObject> {
  // ═══════════════════════════════════════════════════════════════════════════
  // Static API
  // ═══════════════════════════════════════════════════════════════════════════

  static eq<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.EQ, value };
  }

  static ne<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.NE, value };
  }

  static gt<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.GT, value };
  }

  static gte<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.GTE, value };
  }

  static lt<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.LT, value };
  }

  static lte<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.LTE, value };
  }

  static contains<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: string,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.CONTAINS, value };
  }

  static notContains<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: string,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.NCONTAINS, value };
  }

  static starts<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: string,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.STARTS, value };
  }

  static notStarts<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: string,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.NSTARTS, value };
  }

  static ends<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: string,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.ENDS, value };
  }

  static notEnds<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: string,
  ): WhereConditionScalar<E> {
    return { field, operator: WhereOperator.NENDS, value };
  }

  static in<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown[],
  ): WhereConditionArray<E> {
    return { field, operator: WhereOperator.IN, value };
  }

  static notIn<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    value: unknown[],
  ): WhereConditionArray<E> {
    return { field, operator: WhereOperator.NIN, value };
  }

  static isNull<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
  ): WhereConditionNullary<E> {
    return { field, operator: WhereOperator.IS_NULL };
  }

  static notNull<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
  ): WhereConditionNullary<E> {
    return { field, operator: WhereOperator.NOT_NULL };
  }

  static between<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
    from: unknown,
    to: unknown,
  ): WhereConditionPair<E> {
    return { field, operator: WhereOperator.BETWEEN, value: [from, to] };
  }

  /**
   * An always-false clause — matches zero rows, and cannot be narrowed away
   * into "no constraint" the way an absent `where` would be. The canonical way
   * to express "resolved to nothing" for a fail-closed guard clause (e.g. an
   * empty tenant-id set). See `WhereNever` and `toDnf`.
   */
  static never(): WhereNever {
    return NEVER;
  }

  /**
   * `AND` requires at least one condition — an empty `AND` has no
   * conditions to be false about, so silently accepting one would let
   * `Where.and(...possiblyEmptyArray)` collapse to "no constraint" the
   * moment the array happens to be empty. Callers must guard emptiness
   * explicitly.
   */
  static and(...conditions: WhereClause[]): WhereCompound {
    if (conditions.length === 0) {
      throw new RuntimeException({
        message: 'Where.and() requires at least one condition',
        fault: 'usage',
      });
    }
    return { operator: WhereCompoundOperator.AND, conditions };
  }

  /**
   * `OR`'s identity for zero conditions is "none of them matched" — unlike
   * `and()`, this is safe to resolve automatically rather than requiring
   * the caller to guard it, since the correct answer (match nothing) is
   * unambiguous. Makes `Where.or(...tenantIds.map(...))` correct by
   * construction when `tenantIds` happens to be empty.
   */
  static or(...conditions: WhereClause[]): WhereCompound | WhereNever {
    if (conditions.length === 0) {
      return Where.never();
    }
    return { operator: WhereCompoundOperator.OR, conditions };
  }

  static where(clause: WhereClause): { where: WhereClause } {
    return { where: clause };
  }

  static for<E extends PlainLiteralObject>(): Where<E> {
    return new Where<E>();
  }

  /**
   * Tag a WhereCondition with a relation name.
   *
   * @example
   * ```typescript
   * Where.rel('tasks', Where.eq('status', 'active'))
   * // => { field: 'status', operator: 'eq', value: 'active', relation: 'tasks' }
   * ```
   */
  static rel<
    E extends PlainLiteralObject = PlainLiteralObject,
    C extends WhereCondition<E> = WhereCondition<E>,
  >(relation: string, condition: C): C {
    return { ...condition, relation };
  }

  /**
   * Parse a dot-notation field and tag the condition with the extracted relation.
   *
   * @example
   * ```typescript
   * Where.relDot('blog.status', Where.eq('status', 'active'))
   * // => { field: 'status', operator: 'eq', value: 'active', relation: 'blog' }
   * ```
   */
  static relDot<
    E extends PlainLiteralObject = PlainLiteralObject,
    C extends WhereCondition<E> = WhereCondition<E>,
  >(dotField: string, condition: C): C {
    const parts = dotField.split('.');
    if (parts.length === 1) return condition;
    if (parts.length !== 2 || !parts[0]) {
      throw new RuntimeException({
        message: 'relDot expects "relation.field" dot notation, got "%s"',
        messageParams: [
          String(dotField)
            .replace(/[^\w.]/g, '')
            .substring(0, 100),
        ],
        fault: 'usage',
      });
    }
    return { ...condition, relation: parts[0] };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Instance API (field names checked against Entity)
  // ═══════════════════════════════════════════════════════════════════════════

  eq(
    field: EntityColumn<Entity>,
    value: unknown,
  ): WhereConditionScalar<Entity> {
    return Where.eq(field, value);
  }

  ne(
    field: EntityColumn<Entity>,
    value: unknown,
  ): WhereConditionScalar<Entity> {
    return Where.ne(field, value);
  }

  gt(
    field: EntityColumn<Entity>,
    value: unknown,
  ): WhereConditionScalar<Entity> {
    return Where.gt(field, value);
  }

  gte(
    field: EntityColumn<Entity>,
    value: unknown,
  ): WhereConditionScalar<Entity> {
    return Where.gte(field, value);
  }

  lt(
    field: EntityColumn<Entity>,
    value: unknown,
  ): WhereConditionScalar<Entity> {
    return Where.lt(field, value);
  }

  lte(
    field: EntityColumn<Entity>,
    value: unknown,
  ): WhereConditionScalar<Entity> {
    return Where.lte(field, value);
  }

  contains(
    field: EntityColumn<Entity>,
    value: string,
  ): WhereConditionScalar<Entity> {
    return Where.contains(field, value);
  }

  notContains(
    field: EntityColumn<Entity>,
    value: string,
  ): WhereConditionScalar<Entity> {
    return Where.notContains(field, value);
  }

  starts(
    field: EntityColumn<Entity>,
    value: string,
  ): WhereConditionScalar<Entity> {
    return Where.starts(field, value);
  }

  notStarts(
    field: EntityColumn<Entity>,
    value: string,
  ): WhereConditionScalar<Entity> {
    return Where.notStarts(field, value);
  }

  ends(
    field: EntityColumn<Entity>,
    value: string,
  ): WhereConditionScalar<Entity> {
    return Where.ends(field, value);
  }

  notEnds(
    field: EntityColumn<Entity>,
    value: string,
  ): WhereConditionScalar<Entity> {
    return Where.notEnds(field, value);
  }

  in(
    field: EntityColumn<Entity>,
    value: unknown[],
  ): WhereConditionArray<Entity> {
    return Where.in(field, value);
  }

  notIn(
    field: EntityColumn<Entity>,
    value: unknown[],
  ): WhereConditionArray<Entity> {
    return Where.notIn(field, value);
  }

  isNull(field: EntityColumn<Entity>): WhereConditionNullary<Entity> {
    return Where.isNull(field);
  }

  notNull(field: EntityColumn<Entity>): WhereConditionNullary<Entity> {
    return Where.notNull(field);
  }

  between(
    field: EntityColumn<Entity>,
    from: unknown,
    to: unknown,
  ): WhereConditionPair<Entity> {
    return Where.between(field, from, to);
  }

  never(): WhereNever {
    return Where.never();
  }

  and(...conditions: WhereClause[]): WhereCompound {
    return Where.and(...conditions);
  }

  or(...conditions: WhereClause[]): WhereCompound | WhereNever {
    return Where.or(...conditions);
  }

  rel<C extends WhereCondition<Entity> = WhereCondition<Entity>>(
    relation: string,
    condition: C,
  ): C {
    return Where.rel(relation, condition);
  }

  relDot<C extends WhereCondition<Entity> = WhereCondition<Entity>>(
    dotField: string,
    condition: C,
  ): C {
    return Where.relDot(dotField, condition);
  }

  /**
   * Wrap a WhereClause into a `{ where }` options object.
   */
  where(clause: WhereClause): { where: WhereClause } {
    return { where: clause };
  }
}
