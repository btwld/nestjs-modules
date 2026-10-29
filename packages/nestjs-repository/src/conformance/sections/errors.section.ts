import { RepositoryDatabaseException } from '../../exceptions/repository-database.exception.js';
import { assert } from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';
import { seedLibrary } from '../conformance-seed.js';

/**
 * How a driver reports an error its store raised: as a
 * `RepositoryDatabaseException` naming the store.
 */
export function errorsSection(ctx: ConformanceContext): void {
  const { it } = ctx.test;

  const databaseError = (error: unknown): boolean => {
    assert.ok(error instanceof RepositoryDatabaseException, String(error));
    assert.equal(typeof error.context.database, 'string');
    assert.notEqual(error.context.database, '');
    assert.ok(
      error.context.code === undefined ||
        typeof error.context.code === 'string' ||
        typeof error.context.code === 'number',
    );
    return true;
  };

  it('doCreateMany: a key given twice is refused', async () => {
    await assert.rejects(
      ctx.repo('tag').createMany([
        { id: 'tag-same', label: 'first' },
        { id: 'tag-same', label: 'second' },
      ]),
      databaseError,
    );
  });

  if (ctx.capabilities.referentialIntegrity === 'supported') {
    it('doDelete: a row other rows refer to is not deleted', async () => {
      const { authors } = await seedLibrary(ctx);

      await assert.rejects(
        ctx.repo('author').delete(authors.ann),
        databaseError,
      );
      assert.equal(await ctx.repo('author').count(), 3);
    });

    it('doCreate: a reference naming no row is refused', async () => {
      await assert.rejects(
        ctx
          .repo('book')
          .create({ id: 'book-x', title: 'x', authorId: 'author-none' }),
        databaseError,
      );
      assert.equal(await ctx.repo('book').count(), 0);
    });
  }
}
