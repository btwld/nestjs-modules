import { OrderBy } from '../../repository/order-by.helpers.js';
import { Where } from '../../repository/where.helpers.js';
import { assert, assertRows, inOrder } from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';
import { ownAuthor, seedLibrary } from '../conformance-seed.js';

/**
 * Whether a driver loads a relation an entity declares eager, for an entity
 * registered with `allowEagerRelations` — and never for one that is not.
 */
export function eagerResultsSection(ctx: ConformanceContext): void {
  const { it, beforeEach } = ctx.test;

  beforeEach(async () => {
    await seedLibrary(ctx);
    await ctx.repo('bookWithEagerAuthor').createMany([
      { id: 'eager-one', title: 'one', authorId: 'author-ann' },
      { id: 'eager-two', title: 'two', authorId: null },
    ]);
  });

  it('eager results: a read not opted in loads no eager relation', async () => {
    const books = await ctx.repo('book').find();

    assert.equal(books.length, 4);
    assert.ok(books.every((book) => book.author === undefined));
  });

  if (ctx.capabilities.eagerResults === 'supported') {
    it('eager results: an opted-in read holds the eager relation without a join', async () => {
      const ann = await ctx.repo('author').findOne({
        where: Where.eq('id', 'author-ann'),
      });
      assert.ok(ann);

      const found = await ctx.repo('bookWithEagerAuthor').find({
        order: [OrderBy.asc('title')],
      });

      assert.deepStrictEqual(inOrder(found, 'title'), ['one', 'two']);
      // A missing eager relation may be null or absent.
      assertRows(
        found.map(({ author }) => author ?? null),
        [ownAuthor(ann), null],
      );
    });
  } else {
    it('eager results: an opted-in read loads no eager relation', async () => {
      const found = await ctx.repo('bookWithEagerAuthor').find();

      assert.equal(found.length, 2);
      assert.ok(found.every((book) => book.author === undefined));
    });
  }
}
