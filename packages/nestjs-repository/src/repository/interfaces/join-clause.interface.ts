/**
 * Describes how to join a related entity.
 *
 * Structural properties (`on`, `through`, `cardinality`) are resolved
 * from repository relation metadata — only `relation` and `joinType`
 * are specified at query time.
 *
 * @example
 * ```typescript
 * { relation: 'blog' }
 * { relation: 'posts', joinType: 'INNER' }
 * ```
 */
export interface JoinClause {
  /** Relation name to join (must match entity metadata). */
  relation: string;

  /** Join semantics: 'LEFT' (default) or 'INNER'. */
  joinType?: 'LEFT' | 'INNER';
}
