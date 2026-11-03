import { OrderBy } from '../../repository/order-by.helpers.js';
import { Where } from '../../repository/where.helpers.js';
import { assert, inOrder } from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';
import { seedItems, seedLibrary } from '../conformance-seed.js';

/**
 * How a driver counts: by `where`, `join` and `withDeleted` only, and by
 * root rows, never by joined ones.
 */
export function countsSection(ctx: ConformanceContext): void {
  const { describe, it, beforeEach } = ctx.test;
  const softDelete = ctx.capabilities.softDelete === 'supported';

  it('doCount: counts nothing when there are no rows', async () => {
    assert.equal(await ctx.repo('item').count(), 0);
    assert.deepStrictEqual(await ctx.repo('item').findAndCount(), [[], 0]);
  });

  describe('items', () => {
    beforeEach(async () => {
      await seedItems(ctx);
    });

    it('doCount: counts what find returns', async () => {
      const where = Where.gte('rank', 2);

      assert.equal(
        await ctx.repo('item').count({ where }),
        (await ctx.repo('item').find({ where })).length,
      );
      assert.equal(await ctx.repo('item').count({ where }), 3);
    });

    it('doCount: counts nothing for never', async () => {
      assert.equal(await ctx.repo('item').count({ where: Where.never() }), 0);
      assert.deepStrictEqual(
        await ctx.repo('item').findAndCount({ where: Where.never() }),
        [[], 0],
      );
    });

    it('doFindAndCount: counts every match, whatever the page', async () => {
      const [page, total] = await ctx.repo('item').findAndCount({
        order: [OrderBy.asc('name')],
        skip: 1,
        take: 2,
      });

      assert.deepStrictEqual(inOrder(page, 'name'), ['bravo', 'charlie']);
      assert.equal(total, 5);
    });

    it('doFindAndCount: counts every match, whatever the select', async () => {
      // A page, so the total is counted rather than taken from the rows;
      // `rank` holds a NULL, which a count of distinct values would skip.
      const [page, total] = await ctx.repo('item').findAndCount({
        select: ['name', 'rank'],
        order: [OrderBy.asc('name')],
        take: 2,
      });

      assert.deepStrictEqual(inOrder(page, 'name'), ['alpha', 'bravo']);
      assert.equal(total, 5);

      const [, ranks] = await ctx.repo('item').findAndCount({
        select: ['rank'],
        order: [OrderBy.asc('name')],
        take: 2,
      });
      assert.equal(ranks, 5);
    });

    if (softDelete) {
      it('doCount: counts soft-deleted rows only when asked for them', async () => {
        const bravo = await ctx.repo('item').findOne({
          where: Where.eq('name', 'bravo'),
        });
        assert.ok(bravo);
        await ctx.repo('item').softDelete(bravo);

        assert.equal(await ctx.repo('item').count(), 4);
        assert.equal(await ctx.repo('item').count({ withDeleted: true }), 5);
      });
    }
  });

  describe('joins', () => {
    beforeEach(async () => {
      await seedLibrary(ctx);
    });

    it('doCount: counts roots under a to-many join, not joined rows', async () => {
      const join = [{ relation: 'books' }];

      assert.equal(await ctx.repo('author').count({ join }), 3);

      const [page, total] = await ctx.repo('author').findAndCount({
        join,
        order: [OrderBy.asc('name')],
        take: 1,
      });

      assert.deepStrictEqual(inOrder(page, 'name'), ['ann']);
      assert.equal(total, 3);
    });

    it('doCount: counts what find returns under a joined filter', async () => {
      const options = {
        join: [{ relation: 'books' }],
        where: Where.rel('books', Where.notNull('id')),
      };

      assert.equal(await ctx.repo('author').count(options), 2);
      assert.equal(
        (await ctx.repo('author').find(options)).length,
        await ctx.repo('author').count(options),
      );
      assert.equal((await ctx.repo('author').findAndCount(options))[1], 2);
    });

    if (softDelete) {
      it('doCount: a joined filter leaves out soft-deleted related rows unless asked for them', async () => {
        const beta = await ctx.repo('book').findOne({
          where: Where.eq('title', 'beta'),
        });
        assert.ok(beta);
        await ctx.repo('book').softDelete(beta);

        const options = {
          join: [{ relation: 'books' }],
          where: Where.rel('books', Where.eq('title', 'beta')),
        };

        assert.equal(await ctx.repo('author').count(options), 0);
        assert.equal((await ctx.repo('author').findAndCount(options))[1], 0);
        assert.equal(
          await ctx.repo('author').count({ ...options, withDeleted: true }),
          1,
        );
      });
    }

    it('doCount: counts roots under a many-to-many join, not junction rows', async () => {
      const join = [{ relation: 'books' }];

      assert.equal(await ctx.repo('tag').count({ join }), 2);

      const [page, total] = await ctx.repo('tag').findAndCount({
        join,
        order: [OrderBy.asc('label')],
        take: 1,
      });

      assert.deepStrictEqual(inOrder(page, 'label'), ['news']);
      assert.equal(total, 2);
      assert.equal(
        await ctx.repo('tag').count({
          join,
          where: Where.rel('books', Where.notNull('id')),
        }),
        2,
      );
    });
  });
}
