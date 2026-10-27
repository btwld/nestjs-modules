/**
 * Domain props for a record that is either an original or a correction of
 * one.
 *
 * A discriminated union rather than a single shape with two nullable fields,
 * because "a correction must state a reason" is not expressible in the
 * latter — it would admit a correction with no reason, and an original with
 * one, both of which are meaningless.
 *
 * Being a union, it cannot be extended by an interface or implemented by a
 * class: `interface X extends CorrectableInterface` fails with TS2312, and
 * `class X implements CorrectableInterface` with TS2422, because a union has
 * no statically known members. Intersect it into the aggregate's props type
 * instead.
 *
 * The persistence row is the looser shape — two nullable columns — and the
 * mapper is where that row narrows into this union, so the mapper is where the
 * reason-pairing rule is enforced. `CorrectionChainRecord` in
 * `@concepta/nestjs-repository` is the persistence-side counterpart: the
 * minimum a row needs for `resolveCorrectionChain` to walk it.
 *
 * @example
 * ```ts
 * type StatementItemProps = { amount: string } & CorrectableInterface;
 *
 * function toLineage(row: {
 *   correctedId: string | null;
 *   reason: string | null;
 * }): CorrectableInterface {
 *   if (row.correctedId === null && row.reason === null) {
 *     return { correctedId: null, reason: null };
 *   }
 *   if (row.correctedId !== null && row.reason !== null) {
 *     return { correctedId: row.correctedId, reason: row.reason };
 *   }
 *   throw new RuntimeException({ message: 'Correction lineage is malformed' });
 * }
 * ```
 */
export type CorrectableInterface =
  | {
      /** This record is an original. */
      correctedId: null;
      reason: null;
    }
  | {
      /** The id of the record this one corrects. */
      correctedId: string;
      /** Why the correction was made. Required — a correction without a stated reason is unauditable. */
      reason: string;
    };
