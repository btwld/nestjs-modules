import { EntityNotFoundException } from '../../exceptions/entity-not-found.exception.js';
import { Where } from '../../repository/where.helpers.js';
import {
  assert,
  assertRows,
  inOrder,
  valuesOf,
} from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';
import { ownAuthor, ownBook, seedLibrary } from '../conformance-seed.js';

/**
 * How a driver writes: what each write persists and returns.
 */
export function writesSection(ctx: ConformanceContext): void {
  const { it } = ctx.test;
  const softDelete = ctx.capabilities.softDelete === 'supported';

  const readItem = (id: string | number) =>
    ctx.repo('item').findOne({ where: Where.eq('id', id), withDeleted: true });

  it('doCreate: generates a key and returns the row as stored', async () => {
    const created = await ctx
      .repo('item')
      .create({ name: 'one', rank: 1, note: 'n' });

    assert.notEqual(created.id, undefined);
    assert.notEqual(created.id, null);
    assert.equal(created.removedAt, null);
    assertRows(created, await readItem(created.id));
  });

  it('doCreate: keeps a key the caller gives', async () => {
    const created = await ctx
      .repo('author')
      .create({ id: 'author-x', name: 'x' });
    const found = await ctx.repo('author').findOne({
      where: Where.eq('id', 'author-x'),
    });

    assertRows(created, { id: 'author-x', name: 'x', removedAt: null });
    assertRows(found, created);
  });

  it('doCreate: writes explicit nulls', async () => {
    const created = await ctx
      .repo('item')
      .create({ name: 'n', rank: null, note: null });

    assert.equal(created.rank, null);
    assert.equal(created.note, null);
    assertRows(created, await readItem(created.id));
  });

  it('doCreateMany: returns the rows in the order given', async () => {
    const created = await ctx.repo('item').createMany([
      { name: 'zulu', rank: null, note: null },
      { name: 'yankee', rank: null, note: null },
      { name: 'xray', rank: null, note: null },
    ]);

    assert.deepStrictEqual(inOrder(created, 'name'), [
      'zulu',
      'yankee',
      'xray',
    ]);
    assert.equal(await ctx.repo('item').count(), 3);
    assert.deepStrictEqual(await ctx.repo('item').createMany([]), []);
  });

  it('doUpdate: writes the given columns and returns the row as stored', async () => {
    const created = await ctx
      .repo('item')
      .create({ name: 'one', rank: 1, note: 'n' });
    const updated = await ctx
      .repo('item')
      .update(created, { rank: 2, note: null });

    assert.equal(updated.name, 'one');
    assert.equal(updated.rank, 2);
    assert.equal(updated.note, null);
    assertRows(updated, await readItem(created.id));
  });

  it('doUpdate: keeps stored values a stale row holds for columns it does not write', async () => {
    const { books, authors } = await seedLibrary(ctx);
    await ctx.repo('book').update(books.delta, { title: 'renamed' });

    const updated = await ctx.repo('book').update(books.delta, {
      authorId: authors.cat.id,
    });
    const found = await ctx.repo('book').findOne({
      where: Where.eq('id', books.delta.id),
    });

    assert.equal(updated.title, 'renamed');
    assert.equal(updated.authorId, authors.cat.id);
    assertRows(updated, found);
  });

  it('doReplace: keeps stored values a stale row holds for columns it does not write', async () => {
    const { books, authors } = await seedLibrary(ctx);
    await ctx.repo('book').replace(books.delta, { title: 'renamed' });

    const replaced = await ctx.repo('book').replace(books.delta, {
      authorId: authors.cat.id,
    });
    const found = await ctx.repo('book').findOne({
      where: Where.eq('id', books.delta.id),
    });

    assert.equal(replaced.title, 'renamed');
    assert.equal(replaced.authorId, authors.cat.id);
    assertRows(replaced, found);
  });

  it('doUpdate: returns the stored row when the data changes nothing', async () => {
    const { books } = await seedLibrary(ctx);
    await ctx.repo('book').update(books.delta, { title: 'renamed' });

    const updated = await ctx.repo('book').update(books.delta, {});

    assertRows(updated, { ...ownBook(books.delta), title: 'renamed' });
  });

  it('doUpdate and doReplace: a row deleted after it was read is not found', async () => {
    const { books } = await seedLibrary(ctx);
    await ctx.repo('book').delete(books.delta);

    await assert.rejects(
      ctx.repo('book').update(books.delta, { title: 'renamed' }),
      EntityNotFoundException,
    );
    await assert.rejects(
      ctx.repo('book').replace(books.delta, { title: 'renamed' }),
      EntityNotFoundException,
    );
    assert.equal(
      await ctx.repo('book').findOne({
        where: Where.eq('id', books.delta.id),
        withDeleted: true,
      }),
      null,
    );
  });

  if (ctx.capabilities.relations === 'supported') {
    it('doUpdate: a new foreign key shows in a later join', async () => {
      const { books, authors } = await seedLibrary(ctx);
      await ctx.repo('book').update(books.delta, { authorId: authors.cat.id });

      const found = await ctx.repo('book').findOne({
        where: Where.eq('id', books.delta.id),
        join: [{ relation: 'author' }],
      });

      assertRows(found?.author, ownAuthor(authors.cat));
    });
  }

  it('doUpsert: inserts without a key, inserts for an unknown key, updates for a known one', async () => {
    const generated = await ctx
      .repo('item')
      .upsert({ name: 'new', rank: null, note: null });
    const inserted = await ctx
      .repo('author')
      .upsert({ id: 'author-y', name: 'y' });
    const updated = await ctx
      .repo('author')
      .upsert({ id: 'author-y', name: 'why' });

    assertRows(generated, await readItem(generated.id));
    assertRows(inserted, { id: 'author-y', name: 'y', removedAt: null });
    assertRows(updated, { id: 'author-y', name: 'why', removedAt: null });
    assert.equal(await ctx.repo('author').count(), 1);
  });

  it('doDelete: removes the row and returns it with its key', async () => {
    const created = await ctx
      .repo('item')
      .create({ name: 'gone', rank: null, note: null });

    const deleted = await ctx.repo('item').delete(created);

    assert.equal(deleted.id, created.id);
    assert.equal(await readItem(created.id), null);
  });

  it('doDeleteMany: removes the rows and returns them with their keys, in order', async () => {
    const created = await ctx.repo('item').createMany([
      { name: 'a', rank: null, note: null },
      { name: 'b', rank: null, note: null },
      { name: 'c', rank: null, note: null },
    ]);
    const [a, b, c] = created;
    assert.ok(a && b && c);

    const deleted = await ctx.repo('item').deleteMany([c, a]);

    assert.deepStrictEqual(inOrder(deleted, 'id'), [c.id, a.id]);
    assert.deepStrictEqual(valuesOf(await ctx.repo('item').find(), 'name'), [
      'b',
    ]);
  });

  if (softDelete) {
    it('doSoftDelete and doRestore: set and clear the remove date', async () => {
      const created = await ctx
        .repo('item')
        .create({ name: 'soft', rank: null, note: null });

      const removed = await ctx.repo('item').softDelete(created);

      assert.ok(removed.removedAt instanceof Date);
      assert.equal(await ctx.repo('item').count(), 0);
      assert.equal(await ctx.repo('item').count({ withDeleted: true }), 1);

      const restored = await ctx.repo('item').restore(removed);

      assert.equal(restored.removedAt, null);
      assert.equal(await ctx.repo('item').count(), 1);
    });

    it('doRestore: leaves a live row live', async () => {
      const created = await ctx
        .repo('item')
        .create({ name: 'live', rank: null, note: null });

      const restored = await ctx.repo('item').restore(created);

      assert.equal(restored.removedAt, null);
      assert.equal(restored.name, 'live');
      assert.equal(await ctx.repo('item').count(), 1);
    });

    it('doDelete and doDeleteMany: remove soft-deleted rows too', async () => {
      const [one, two, three] = await ctx.repo('item').createMany(
        ['one', 'two', 'three'].map((name) => ({
          name,
          rank: null,
          note: null,
        })),
      );
      assert.ok(one && two && three);
      const removedOne = await ctx.repo('item').softDelete(one);
      const removedTwo = await ctx.repo('item').softDelete(two);
      const removedThree = await ctx.repo('item').softDelete(three);

      await ctx.repo('item').delete(removedOne);
      await ctx.repo('item').deleteMany([removedTwo, removedThree]);

      assert.equal(await ctx.repo('item').count({ withDeleted: true }), 0);
    });
  }

  it('every write that changes a stored row changes its version', async () => {
    const versions: number[] = [];
    const item = ctx.repo('item');

    const created = await item.create({ name: 'v', rank: 1, note: null });
    versions.push(created.version);
    const updated = await item.update(created, { rank: 2 });
    versions.push(updated.version);
    const replaced = await item.replace(updated, { rank: 3 });
    versions.push(replaced.version);
    const upserted = await item.upsert({ id: replaced.id, name: 'v', rank: 4 });
    versions.push(upserted.version);
    if (softDelete) {
      const removed = await item.softDelete(upserted);
      versions.push(removed.version);
      const restored = await item.restore(removed);
      versions.push(restored.version);
    }

    assert.equal(new Set(versions).size, versions.length, String(versions));
  });

  it('a write that changes nothing keeps the version', async () => {
    const item = ctx.repo('item');
    const created = await item.create({ name: 'v', rank: 1, note: null });
    const { version } = created;

    type Write = [string, () => Promise<{ version: number }>];
    const restore: Write[] = softDelete
      ? [['restore of a live row', () => item.restore(created)]]
      : [];
    const writes: Write[] = [
      ['update with no data', () => item.update(created, {})],
      ['update with stored values', () => item.update(created, { rank: 1 })],
      ['replace with stored values', () => item.replace(created, { rank: 1 })],
      [
        'upsert with stored values',
        () => item.upsert({ id: created.id, name: 'v', rank: 1, note: null }),
      ],
      ...restore,
    ];

    for (const [label, write] of writes) {
      assert.equal((await write()).version, version, label);
      assert.equal((await readItem(created.id))?.version, version, label);
    }
  });
}
