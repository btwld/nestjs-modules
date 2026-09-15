import { type JoinClause } from './interfaces/join-clause.interface.js';

/**
 * Join clause builder — static API for constructing `JoinClause` arrays.
 *
 * @example
 * ```typescript
 * repository.findAndCount({
 *   ...Join.join(Join.left('posts'), Join.inner('company')),
 * });
 * ```
 */
export class Join {
  /**
   * Create a LEFT JOIN clause (default join type).
   */
  static left(relation: string): JoinClause {
    return { relation, joinType: 'LEFT' };
  }

  /**
   * Create an INNER JOIN clause.
   */
  static inner(relation: string): JoinClause {
    return { relation, joinType: 'INNER' };
  }

  /**
   * Wrap join clauses into `{ join: clauses }` for passing to find options.
   */
  static join(...clauses: JoinClause[]): { join: JoinClause[] } {
    return { join: clauses };
  }
}
