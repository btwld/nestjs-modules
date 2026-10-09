import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryInterface } from '../../repository/interfaces/repository.interface.js';
import { CorrectionChainDepthException } from '../exceptions/correction-chain-depth.exception.js';
import {
  type CorrectionChainRecord,
  resolveCorrectionChain,
} from '../resolve-correction-chain.js';

interface Item extends CorrectionChainRecord {
  id: string;
  correctedId: string | null;
  amount: string;
}

const item = (
  id: string,
  correctedId: string | null,
  amount: string,
): Item => ({
  id,
  correctedId,
  amount,
});

/**
 * Stands in for the repository, resolving `correctedId = x` from a fixed set.
 *
 * `visible` models row scope: a record outside the caller's scope resolves as
 * a miss, exactly as a scoped repository would report it.
 */
function repositoryOf(
  rows: Item[],
  visible: (row: Item) => boolean = () => true,
): { repository: RepositoryInterface<Item>; reads: PlainLiteralObject[] } {
  const reads: PlainLiteralObject[] = [];

  const repository = {
    async findOne(options: PlainLiteralObject): Promise<Item | null> {
      reads.push(options);

      const where = options.where;
      const target =
        where && typeof where === 'object' && 'value' in where
          ? where.value
          : undefined;

      return (
        rows.find((row) => row.correctedId === target && visible(row)) ?? null
      );
    },
  } as unknown as RepositoryInterface<Item>;

  return { repository, reads };
}

describe('resolveCorrectionChain', () => {
  it('returns the record itself when nothing corrects it', async () => {
    const original = item('a', null, '100.00');
    const { repository } = repositoryOf([original]);

    expect(await resolveCorrectionChain(repository, original)).toBe(original);
  });

  it('follows a single correction', async () => {
    const original = item('a', null, '100.00');
    const correction = item('b', 'a', '90.00');
    const { repository } = repositoryOf([original, correction]);

    expect(await resolveCorrectionChain(repository, original)).toBe(correction);
  });

  it('follows a chain to the end', async () => {
    const rows = [
      item('a', null, '100.00'),
      item('b', 'a', '90.00'),
      item('c', 'b', '95.00'),
      item('d', 'c', '93.00'),
    ];
    const { repository } = repositoryOf(rows);

    const effective = await resolveCorrectionChain(repository, rows[0]);

    expect(effective.id).toBe('d');
  });

  it('forwards the caller ctx on every read, so the chain joins their transaction and scope', async () => {
    const rows = [item('a', null, '100.00'), item('b', 'a', '90.00')];
    const { repository, reads } = repositoryOf(rows);
    const ctx = { marker: 'caller' };

    await resolveCorrectionChain(repository, rows[0], { ctx });

    expect(reads.length).toBeGreaterThan(0);
    for (const read of reads) {
      expect(read.ctx).toBe(ctx);
    }
  });

  /**
   * Row scope applies to the resolver's own reads, so a correction the caller
   * cannot see stops the chain rather than being reported as existing.
   */
  it('stops at the last record the caller can see', async () => {
    const rows = [
      item('a', null, '100.00'),
      item('b', 'a', '90.00'),
      item('c', 'b', '95.00'),
    ];
    const { repository } = repositoryOf(rows, (row) => row.id !== 'c');

    const effective = await resolveCorrectionChain(repository, rows[0]);

    expect(effective.id).toBe('b');
  });

  describe('cycles', () => {
    /**
     * Reachable whenever ids are caller-supplied: `create` stays open on an
     * append-only entity by design, so the repository layer cannot prevent
     * `a` and `b` correcting each other. An unbounded walk would hang the
     * request instead of answering it.
     */
    it('terminates on a two-record cycle', async () => {
      const rows = [item('a', 'b', '100.00'), item('b', 'a', '90.00')];
      const { repository } = repositoryOf(rows);

      const effective = await resolveCorrectionChain(repository, rows[0]);

      expect(effective.id).toBe('b');
    });

    it('terminates on a self-reference', async () => {
      const selfish = item('a', 'a', '100.00');
      const { repository } = repositoryOf([selfish]);

      expect(await resolveCorrectionChain(repository, selfish)).toBe(selfish);
    });

    const chainOf = (length: number) =>
      Array.from({ length }, (_, i) =>
        item(`r${i}`, i === 0 ? null : `r${i - 1}`, '1.00'),
      );

    it('resolves a chain of exactly maxDepth corrections', async () => {
      const rows = chainOf(4);
      const { repository } = repositoryOf(rows);

      const effective = await resolveCorrectionChain(repository, rows[0], {
        maxDepth: 3,
      });

      expect(effective.id).toBe('r3');
    });

    /**
     * Returning `r3` here would present a superseded record as the one in
     * effect.
     */
    it('refuses a chain longer than maxDepth corrections', async () => {
      const rows = chainOf(50);
      const { repository, reads } = repositoryOf(rows);

      await expect(
        resolveCorrectionChain(repository, rows[0], { maxDepth: 3 }),
      ).rejects.toThrow(CorrectionChainDepthException);
      expect(reads).toHaveLength(4);
    });
  });
});
