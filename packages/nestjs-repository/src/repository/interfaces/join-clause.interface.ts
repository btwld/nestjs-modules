/**
 * Includes a related entity in each row a read returns.
 *
 * A join never changes which rows come back: a row with no related row still
 * does, holding `null` or `[]`. Only `where` narrows rows, so "has a related
 * row" is a filter on one of the related row's columns.
 *
 * Structural properties (`on`, `through`, `cardinality`) are resolved
 * from repository relation metadata — only `relation` is specified at
 * query time.
 *
 * @example
 * ```typescript
 * { join: [{ relation: 'posts' }] }
 * {
 *   join: [{ relation: 'posts' }],
 *   where: Where.rel('posts', Where.notNull('id')),
 * }
 * ```
 */
export interface JoinClause {
  /** Relation name to join (must match entity metadata). */
  relation: string;
}
