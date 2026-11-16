import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryInterface } from '../repository/interfaces/repository.interface.js';
import { Where } from '../repository/where.helpers.js';

import { CorrectionChainDepthException } from './exceptions/correction-chain-depth.exception.js';

/**
 * The minimum shape {@link resolveCorrectionChain} needs on a record.
 */
export interface CorrectionChainRecord extends PlainLiteralObject {
  id: string;
  correctedId?: string | null;
}

/**
 * How many corrections the traversal follows before refusing.
 */
const DEFAULT_MAX_DEPTH = 100;

/**
 * Follow the corrections of `record` to the one currently in effect.
 *
 * A correction is a record whose `correctedId` names an earlier one, so the
 * effective record is the end of that forward chain: the one nothing else
 * corrects.
 *
 * **Reads go through the repository that was passed in**, which matters when
 * the entity is row-scoped — a correction belonging to another scope resolves
 * as a miss, so the chain stops at the last record the caller can actually
 * see rather than reporting the existence of one they cannot. Note that row
 * scope does not check foreign keys on write (`RowScopeBase`, "Checks this
 * class cannot make"), so nothing stops a `correctedId` pointing across
 * scopes in the first place; override `scopeWrite` to police it.
 *
 * A cycle — reachable whenever ids are caller-supplied — ends the walk at the
 * last record before it repeats. A chain longer than `maxDepth` corrections
 * (default 100) throws {@link CorrectionChainDepthException} rather than
 * returning a record that something else supersedes.
 *
 * @param repository - The repository for the record's entity. Pass the
 *   caller's `ctx` so the read joins their transaction and scope.
 * @param record - The record to resolve forward from.
 * @param options - `ctx` to forward, and an optional depth bound.
 * @returns The record in effect. `record` itself when nothing corrects it.
 */
export async function resolveCorrectionChain<
  Entity extends CorrectionChainRecord,
>(
  repository: RepositoryInterface<Entity>,
  record: Entity,
  options?: { ctx?: PlainLiteralObject; maxDepth?: number },
): Promise<Entity> {
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;

  let current = record;
  const visited = new Set<string>([current.id]);

  for (let depth = 0; ; depth++) {
    const correction: Entity | null = await repository.findOne({
      where: Where.eq('correctedId', current.id),
      ctx: options?.ctx,
    });

    if (!correction) return current;

    // A self-reference or a loop. Returning what we have is the safe answer:
    // the alternative is looping until the depth bound, which reports the
    // same thing far later and far less clearly.
    if (visited.has(correction.id)) return current;

    if (depth === maxDepth) {
      throw new CorrectionChainDepthException(record.id, maxDepth);
    }

    visited.add(correction.id);
    current = correction;
  }
}
