import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import { OrderBy } from '../../repository/order-by.helpers.js';
import { Where } from '../../repository/where.helpers.js';
import {
  assert,
  assertRows,
  inOrder,
  sortedBy,
  valuesOf,
} from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';
import {
  ownAuthor,
  ownBook,
  ownTag,
  seedItems,
  seedLibrary,
} from '../conformance-seed.js';
import { type ConformanceItemInterface } from '../interfaces/conformance-item.interface.js';
import { type ConformanceLibraryInterface } from '../interfaces/conformance-library.interface.js';

/**
 * How a driver translates reads: every operator, compound and `never`,
 * order, paging, `select`, soft-deleted rows, and every kind of join.
 */
export function readTranslationSection(ctx: ConformanceContext): void {
  const { describe, it, beforeEach } = ctx.test;

  describe('items', () => {
    let items: ConformanceItemInterface[];

    beforeEach(async () => {
      items = await seedItems(ctx);
    });

    const names = async (where: WhereClause): Promise<string[]> =>
      valuesOf(await ctx.repo('item').find({ where }), 'name');

    it('doFind: returns every row with every own column', async () => {
      const found = await ctx
        .repo('item')
        .find({ order: [OrderBy.asc('name')] });

      assertRows(found, items);
    });

    it('doFind: returns only the selected columns', async () => {
      const found = await ctx.repo('item').find({
        select: ['name', 'rank'],
        order: [OrderBy.asc('name')],
      });

      assertRows(found, [
        { name: 'alpha', rank: 1 },
        { name: 'bravo', rank: 2 },
        { name: 'charlie', rank: 3 },
        { name: 'delta', rank: null },
        { name: 'echo', rank: 5 },
      ]);
    });

    it('doFind: returns every own column for an empty select', async () => {
      const found = await ctx.repo('item').find({
        select: [],
        order: [OrderBy.asc('name')],
      });

      assertRows(found, items);
    });

    it('doFind: orders by a column it does not select', async () => {
      const found = await ctx.repo('item').find({
        select: ['name'],
        where: Where.notNull('rank'),
        order: [OrderBy.desc('rank')],
      });

      assert.deepStrictEqual(inOrder(found, 'name'), [
        'echo',
        'charlie',
        'bravo',
        'alpha',
      ]);
    });

    it('doFind: eq', async () => {
      assert.deepStrictEqual(await names(Where.eq('name', 'bravo')), ['bravo']);
    });

    it('doFind: ne leaves out the value and null', async () => {
      assert.deepStrictEqual(await names(Where.ne('rank', 2)), [
        'alpha',
        'charlie',
        'echo',
      ]);
    });

    it('doFind: in', async () => {
      assert.deepStrictEqual(await names(Where.in('rank', [1, 3])), [
        'alpha',
        'charlie',
      ]);
    });

    it('doFind: nin leaves out the values and null', async () => {
      assert.deepStrictEqual(await names(Where.notIn('rank', [1, 3])), [
        'bravo',
        'echo',
      ]);
    });

    it('doFind: in with no values matches nothing', async () => {
      assert.deepStrictEqual(await names(Where.in('rank', [])), []);
    });

    it('doFind: nin with no values filters nothing out', async () => {
      assert.deepStrictEqual(await names(Where.notIn('name', [])), [
        'alpha',
        'bravo',
        'charlie',
        'delta',
        'echo',
      ]);
    });

    it('doFind: null and not null', async () => {
      assert.deepStrictEqual(await names(Where.isNull('rank')), ['delta']);
      assert.deepStrictEqual(await names(Where.notNull('rank')), [
        'alpha',
        'bravo',
        'charlie',
        'echo',
      ]);
    });

    it('doFind: gt, gte, lt, lte', async () => {
      assert.deepStrictEqual(await names(Where.gt('rank', 2)), [
        'charlie',
        'echo',
      ]);
      assert.deepStrictEqual(await names(Where.gte('rank', 2)), [
        'bravo',
        'charlie',
        'echo',
      ]);
      assert.deepStrictEqual(await names(Where.lt('rank', 3)), [
        'alpha',
        'bravo',
      ]);
      assert.deepStrictEqual(await names(Where.lte('rank', 3)), [
        'alpha',
        'bravo',
        'charlie',
      ]);
    });

    it('doFind: between includes both ends', async () => {
      assert.deepStrictEqual(await names(Where.between('rank', 2, 3)), [
        'bravo',
        'charlie',
      ]);
    });

    it('doFind: contains, starts and ends, and their negations', async () => {
      assert.deepStrictEqual(await names(Where.contains('name', 'ha')), [
        'alpha',
        'charlie',
      ]);
      assert.deepStrictEqual(await names(Where.notContains('name', 'ha')), [
        'bravo',
        'delta',
        'echo',
      ]);
      assert.deepStrictEqual(await names(Where.starts('name', 'b')), ['bravo']);
      assert.deepStrictEqual(await names(Where.notStarts('name', 'b')), [
        'alpha',
        'charlie',
        'delta',
        'echo',
      ]);
      assert.deepStrictEqual(await names(Where.ends('name', 'o')), [
        'bravo',
        'echo',
      ]);
      assert.deepStrictEqual(await names(Where.notEnds('name', 'o')), [
        'alpha',
        'charlie',
        'delta',
      ]);
    });

    it('doFind: text matches take every character literally', async () => {
      assert.deepStrictEqual(await names(Where.contains('note', '%')), [
        'alpha',
      ]);
      assert.deepStrictEqual(await names(Where.contains('note', '_')), [
        'bravo',
      ]);
      assert.deepStrictEqual(await names(Where.contains('note', '\\')), [
        'delta',
      ]);
      assert.deepStrictEqual(await names(Where.starts('note', '100%')), [
        'alpha',
      ]);
      assert.deepStrictEqual(await names(Where.ends('note', '_case')), [
        'bravo',
      ]);
    });

    it('doFind: text matches take pattern characters literally', async () => {
      // Each probe would also match its decoy if read as a pattern.
      await ctx.repo('item').createMany(
        [
          ['dot', 'a.c'],
          ['dot-decoy', 'abc'],
          ['star', 'a*c'],
          ['star-decoy', 'aaac'],
          ['class', '[ab]'],
          ['class-decoy', 'b'],
          ['group', '(x)'],
          ['group-decoy', 'x'],
          ['anchor', '^s$'],
          ['anchor-decoy', 's'],
        ].map(([name, note]) => ({ name, rank: null, note })),
      );

      for (const [probe, name] of [
        ['a.c', 'dot'],
        ['a*c', 'star'],
        ['[ab]', 'class'],
        ['(x)', 'group'],
        ['^s$', 'anchor'],
      ]) {
        assert.deepStrictEqual(
          await names(Where.contains('note', probe)),
          [name],
          probe,
        );
      }

      assert.deepStrictEqual(await names(Where.starts('note', '^s')), [
        'anchor',
      ]);
      assert.deepStrictEqual(await names(Where.starts('note', 'a.')), ['dot']);
      assert.deepStrictEqual(await names(Where.ends('note', 's$')), ['anchor']);
    });

    it('doFind: a negated text match leaves out null', async () => {
      assert.deepStrictEqual(await names(Where.notContains('note', '%')), [
        'bravo',
        'delta',
        'echo',
      ]);
    });

    it('doFind: keeps each condition its own value within one query', async () => {
      assert.deepStrictEqual(
        await names(
          Where.and(
            Where.starts('name', 'a'),
            Where.ends('name', 'a'),
            Where.notContains('name', 'x'),
            Where.gt('rank', 0),
            Where.lt('rank', 2),
          ),
        ),
        ['alpha'],
      );
    });

    it('doFind: and, or, and an and of ors', async () => {
      assert.deepStrictEqual(
        await names(Where.and(Where.gte('rank', 2), Where.lte('rank', 3))),
        ['bravo', 'charlie'],
      );
      assert.deepStrictEqual(
        await names(Where.or(Where.eq('name', 'alpha'), Where.isNull('rank'))),
        ['alpha', 'delta'],
      );
      assert.deepStrictEqual(
        await names(
          Where.and(
            Where.or(Where.eq('name', 'alpha'), Where.eq('name', 'bravo')),
            Where.gt('rank', 1),
          ),
        ),
        ['bravo'],
      );
    });

    it('doFind: never matches nothing, alone or inside a compound', async () => {
      assert.deepStrictEqual(await names(Where.never()), []);
      assert.deepStrictEqual(
        await names(Where.and(Where.eq('name', 'alpha'), Where.never())),
        [],
      );
      assert.deepStrictEqual(
        await names(Where.or(Where.eq('name', 'alpha'), Where.never())),
        ['alpha'],
      );
    });

    it('doFindOne: never finds nothing', async () => {
      assert.equal(
        await ctx.repo('item').findOne({ where: Where.never() }),
        null,
      );
    });

    it('doFind: orders ascending, descending, and by a second key', async () => {
      const ranked = { where: Where.notNull('rank') };

      assert.deepStrictEqual(
        inOrder(
          await ctx
            .repo('item')
            .find({ ...ranked, order: [OrderBy.asc('rank')] }),
          'name',
        ),
        ['alpha', 'bravo', 'charlie', 'echo'],
      );
      assert.deepStrictEqual(
        inOrder(
          await ctx
            .repo('item')
            .find({ ...ranked, order: [OrderBy.desc('rank')] }),
          'name',
        ),
        ['echo', 'charlie', 'bravo', 'alpha'],
      );

      await ctx.repo('item').create({ name: 'foxtrot', rank: 2, note: null });

      assert.deepStrictEqual(
        inOrder(
          await ctx.repo('item').find({
            ...ranked,
            order: [OrderBy.asc('rank'), OrderBy.desc('name')],
          }),
          'name',
        ),
        ['alpha', 'foxtrot', 'bravo', 'charlie', 'echo'],
      );
    });

    it('doFind: pages in order', async () => {
      const page = await ctx.repo('item').find({
        order: [OrderBy.asc('name')],
        skip: 1,
        take: 2,
      });
      const past = await ctx.repo('item').find({
        order: [OrderBy.asc('name')],
        skip: 10,
      });

      assert.deepStrictEqual(inOrder(page, 'name'), ['bravo', 'charlie']);
      assert.deepStrictEqual(past, []);
    });

    it('doFindOne: returns the first row in order, or null', async () => {
      const first = await ctx.repo('item').findOne({
        order: [OrderBy.desc('name')],
      });
      const none = await ctx.repo('item').findOne({
        where: Where.eq('name', 'zulu'),
      });

      assert.equal(first?.name, 'echo');
      assert.equal(none, null);
    });

    it('doFind: leaves out soft-deleted rows unless asked for them', async () => {
      const bravo = items.find(({ name }) => name === 'bravo');
      assert.ok(bravo);
      await ctx.repo('item').softDelete(bravo);

      const live = await ctx.repo('item').find();
      const all = await ctx.repo('item').find({ withDeleted: true });
      const one = await ctx.repo('item').findOne({
        where: Where.eq('name', 'bravo'),
      });
      const deleted = await ctx.repo('item').findOne({
        where: Where.eq('name', 'bravo'),
        withDeleted: true,
      });

      assert.deepStrictEqual(valuesOf(live, 'name'), [
        'alpha',
        'charlie',
        'delta',
        'echo',
      ]);
      assert.equal(all.length, 5);
      assert.equal(one, null);
      assert.equal(deleted?.name, 'bravo');
    });

    it('doFind: reads with deleted rows on an entity without a remove date', async () => {
      await ctx.repo('plainItem').create({ name: 'only' });

      const found = await ctx.repo('plainItem').find({ withDeleted: true });

      assert.deepStrictEqual(valuesOf(found, 'name'), ['only']);
    });
  });

  describe('joins', () => {
    let library: ConformanceLibraryInterface;

    beforeEach(async () => {
      library = await seedLibrary(ctx);
    });

    it('doFind: a to-one join holds the related row, or null', async () => {
      const found = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        order: [OrderBy.asc('title')],
      });
      const { ann, bob } = library.authors;
      const { alpha, beta, gamma, delta } = library.books;

      assertRows(found, [
        { ...ownBook(alpha), author: ownAuthor(ann) },
        { ...ownBook(beta), author: ownAuthor(ann) },
        { ...ownBook(delta), author: null },
        { ...ownBook(gamma), author: ownAuthor(bob) },
      ]);
    });

    it('doFind: a to-many join holds the related rows, or none, and keeps every root', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        order: [OrderBy.asc('name')],
      });
      const { ann, bob, cat } = library.authors;
      const { alpha, beta, gamma } = library.books;

      assertRows(
        found.map((author) => ({
          ...author,
          books: sortedBy(author.books, 'title'),
        })),
        [
          { ...ownAuthor(ann), books: [ownBook(alpha), ownBook(beta)] },
          { ...ownAuthor(bob), books: [ownBook(gamma)] },
          { ...ownAuthor(cat), books: [] },
        ],
      );
    });

    it('doFindOne: a to-many join holds the related rows', async () => {
      const found = await ctx.repo('author').findOne({
        where: Where.eq('id', library.authors.ann.id),
        join: [{ relation: 'books' }],
      });
      const { alpha, beta } = library.books;

      assertRows(sortedBy(found?.books, 'title'), [
        ownBook(alpha),
        ownBook(beta),
      ]);
    });

    it('doFind: an unmatched to-many join holds no rows', async () => {
      const found = await ctx.repo('book').find({
        join: [{ relation: 'tags' }],
        where: Where.eq('id', library.books.gamma.id),
      });

      assertRows(found, [{ ...ownBook(library.books.gamma), tags: [] }]);
    });

    it('doFind: joins two relations at once', async () => {
      const found = await ctx.repo('book').findOne({
        where: Where.eq('id', library.books.alpha.id),
        join: [{ relation: 'author' }, { relation: 'tags' }],
      });
      const { news, tech } = library.tags;

      assertRows(found && { ...found, tags: sortedBy(found.tags, 'label') }, {
        ...ownBook(library.books.alpha),
        author: ownAuthor(library.authors.ann),
        tags: [ownTag(news), ownTag(tech)],
      });
    });

    it('doFind: selects root columns while joining, even leaving out the keys', async () => {
      const found = await ctx.repo('book').find({
        select: ['title'],
        join: [{ relation: 'author' }],
        where: Where.eq('id', library.books.gamma.id),
      });

      assertRows(found, [
        { title: 'gamma', author: ownAuthor(library.authors.bob) },
      ]);
    });

    it('doFind: filters on a joined column, alone and with a root filter', async () => {
      const byAuthor = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        where: Where.rel('author', Where.eq('name', 'ann')),
      });
      const both = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        where: Where.and(
          Where.eq('title', 'beta'),
          Where.rel('author', Where.eq('name', 'ann')),
        ),
      });

      assert.deepStrictEqual(valuesOf(byAuthor, 'title'), ['alpha', 'beta']);
      assert.deepStrictEqual(valuesOf(both, 'title'), ['beta']);
    });

    it('doFind: matches text on root and joined columns in one query', async () => {
      const found = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        // Each condition alone keeps a book the other leaves out.
        where: Where.and(
          Where.notStarts('title', 'b'),
          Where.rel('author', Where.notEnds('name', 'b')),
        ),
      });

      assert.deepStrictEqual(valuesOf(found, 'title'), ['alpha']);
    });

    it('doFind: a null check on a joined column matches a row with no related row', async () => {
      const found = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        where: Where.rel('author', Where.isNull('id')),
      });

      assertRows(found, [{ ...ownBook(library.books.delta), author: null }]);
    });

    it('doFind: a joined filter that matches nothing returns nothing', async () => {
      const found = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        where: Where.rel('author', Where.eq('name', 'nobody')),
      });

      assert.deepStrictEqual(found, []);
    });

    it('doFind: a filter on a to-many joined column keeps only roots with a match', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        where: Where.rel('books', Where.eq('title', 'gamma')),
      });

      assert.deepStrictEqual(valuesOf(found, 'name'), ['bob']);
    });

    it('doFind: a filter on a to-many joined column narrows the joined rows to those it matches', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        where: Where.rel('books', Where.eq('title', 'alpha')),
      });

      assertRows(found, [
        {
          ...ownAuthor(library.authors.ann),
          books: [ownBook(library.books.alpha)],
        },
      ]);
    });

    it('doFind: a root an or matches on its own columns holds every joined row', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        where: Where.or(
          Where.eq('name', 'ann'),
          Where.rel('books', Where.eq('title', 'gamma')),
        ),
        order: [OrderBy.asc('name')],
      });
      const { alpha, beta, gamma } = library.books;

      assertRows(
        found.map((author) => ({
          ...author,
          books: sortedBy(author.books, 'title'),
        })),
        [
          {
            ...ownAuthor(library.authors.ann),
            books: [ownBook(alpha), ownBook(beta)],
          },
          { ...ownAuthor(library.authors.bob), books: [ownBook(gamma)] },
        ],
      );
    });

    it('doFind: a root an or matches only through a joined column holds only the joined rows it matches', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        where: Where.or(
          Where.eq('name', 'bob'),
          Where.rel('books', Where.eq('title', 'alpha')),
        ),
        order: [OrderBy.asc('name')],
      });
      const { alpha, gamma } = library.books;

      assertRows(found, [
        { ...ownAuthor(library.authors.ann), books: [ownBook(alpha)] },
        { ...ownAuthor(library.authors.bob), books: [ownBook(gamma)] },
      ]);
    });

    it('doFind: a filter on a many-to-many joined column narrows the joined rows to those it matches', async () => {
      const found = await ctx.repo('tag').find({
        join: [{ relation: 'books' }],
        where: Where.rel('books', Where.eq('title', 'beta')),
      });

      assertRows(found, [
        { ...ownTag(library.tags.tech), books: [ownBook(library.books.beta)] },
      ]);
    });

    it('doFind: a null check on a to-many joined column matches a root with no related rows', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        where: Where.rel('books', Where.isNull('id')),
      });

      assertRows(found, [{ ...ownAuthor(library.authors.cat), books: [] }]);
    });

    it('doFind: an or between a joined and a root condition', async () => {
      const found = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        where: Where.or(
          Where.rel('author', Where.eq('name', 'bob')),
          Where.eq('title', 'delta'),
        ),
      });

      assert.deepStrictEqual(valuesOf(found, 'title'), ['delta', 'gamma']);
    });

    it('doFind: orders by a joined column, and by joined and root columns', async () => {
      const byAuthor = await ctx.repo('book').find({
        join: [{ relation: 'author' }],
        where: Where.notNull('authorId'),
        order: [
          OrderBy.rel('author', OrderBy.desc('name')),
          OrderBy.desc('title'),
        ],
      });

      assert.deepStrictEqual(inOrder(byAuthor, 'title'), [
        'gamma',
        'beta',
        'alpha',
      ]);
    });

    it('doFind: pages roots under a to-many join, each holding all its rows', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        order: [OrderBy.asc('name')],
        take: 1,
      });

      assert.deepStrictEqual(inOrder(found, 'name'), ['ann']);
      assert.deepStrictEqual(valuesOf(found[0]?.books ?? [], 'title'), [
        'alpha',
        'beta',
      ]);
    });

    it('doFind: skips roots under a to-many join, not joined rows', async () => {
      const found = await ctx.repo('author').find({
        join: [{ relation: 'books' }],
        order: [OrderBy.desc('name')],
        skip: 2,
        take: 1,
      });

      assert.deepStrictEqual(inOrder(found, 'name'), ['ann']);
      assert.deepStrictEqual(valuesOf(found[0]?.books ?? [], 'title'), [
        'alpha',
        'beta',
      ]);
    });

    it('doFind: selects root columns under a to-many join, leaving out the key', async () => {
      const found = await ctx.repo('author').find({
        select: ['name'],
        join: [{ relation: 'books' }],
        where: Where.eq('name', 'ann'),
      });
      const { alpha, beta } = library.books;

      assertRows(
        found.map((author) => ({
          ...author,
          books: sortedBy(author.books, 'title'),
        })),
        [{ name: 'ann', books: [ownBook(alpha), ownBook(beta)] }],
      );
    });

    it('doFind: leaves soft-deleted related rows out of a join unless asked for them', async () => {
      await ctx.repo('book').softDelete(library.books.beta);
      await ctx.repo('author').softDelete(library.authors.bob);

      const books = await ctx.repo('author').findOne({
        where: Where.eq('id', library.authors.ann.id),
        join: [{ relation: 'books' }],
      });
      const author = await ctx.repo('book').findOne({
        where: Where.eq('id', library.books.gamma.id),
        join: [{ relation: 'author' }],
      });
      const allBooks = await ctx.repo('author').findOne({
        where: Where.eq('id', library.authors.ann.id),
        join: [{ relation: 'books' }],
        withDeleted: true,
      });
      const deletedAuthor = await ctx.repo('book').findOne({
        where: Where.eq('id', library.books.gamma.id),
        join: [{ relation: 'author' }],
        withDeleted: true,
      });

      assert.deepStrictEqual(valuesOf(books?.books ?? [], 'title'), ['alpha']);
      assert.equal(author?.author, null);
      assert.deepStrictEqual(valuesOf(allBooks?.books ?? [], 'title'), [
        'alpha',
        'beta',
      ]);
      assert.equal(deletedAuthor?.author?.name, 'bob');
    });

    it('doFind: joins many-to-many from both sides', async () => {
      const tags = await ctx.repo('tag').find({
        join: [{ relation: 'books' }],
        order: [OrderBy.asc('label')],
      });
      const books = await ctx.repo('book').find({
        join: [{ relation: 'tags' }],
        order: [OrderBy.asc('title')],
      });
      const { alpha, beta } = library.books;
      const { news, tech } = library.tags;

      assertRows(
        tags.map((tag) => ({ ...tag, books: sortedBy(tag.books, 'title') })),
        [
          { ...ownTag(news), books: [ownBook(alpha)] },
          { ...ownTag(tech), books: [ownBook(alpha), ownBook(beta)] },
        ],
      );
      assert.deepStrictEqual(
        books.map((book) => valuesOf(book.tags ?? [], 'label')),
        [['news', 'tech'], ['tech'], [], []],
      );
    });

    it('doFind: filters on a many-to-many joined column from both sides', async () => {
      const tags = await ctx.repo('tag').find({
        join: [{ relation: 'books' }],
        where: Where.rel('books', Where.eq('title', 'beta')),
      });
      const books = await ctx.repo('book').find({
        join: [{ relation: 'tags' }],
        where: Where.rel('tags', Where.eq('label', 'news')),
      });

      assert.deepStrictEqual(valuesOf(tags, 'label'), ['tech']);
      assert.deepStrictEqual(valuesOf(books, 'title'), ['alpha']);
    });
  });

  describe('composite foreign keys', () => {
    beforeEach(async () => {
      await ctx.repo('tenantOrder').createMany([
        { id: 'order-1', tenantId: 'tenant-a', total: 10 },
        { id: 'order-2', tenantId: 'tenant-b', total: 20 },
      ]);
      await ctx.repo('tenantOrderLine').createMany([
        { id: 'line-1', tenantId: 'tenant-a', orderId: 'order-1', qty: 1 },
        { id: 'line-2', tenantId: 'tenant-a', orderId: 'order-1', qty: 2 },
        { id: 'line-3', tenantId: 'tenant-b', orderId: 'order-2', qty: 3 },
      ]);
    });

    it('doFind: joins on every column pair, from both sides', async () => {
      const orders = await ctx.repo('tenantOrder').find({
        join: [{ relation: 'lines' }],
        order: [OrderBy.asc('id')],
      });
      const lines = await ctx.repo('tenantOrderLine').find({
        join: [{ relation: 'order' }],
        order: [OrderBy.asc('id')],
      });

      assert.deepStrictEqual(
        orders.map((order) => valuesOf(order.lines ?? [], 'id')),
        [['line-1', 'line-2'], ['line-3']],
      );
      assert.deepStrictEqual(
        lines.map((line) => line.order?.id),
        ['order-1', 'order-1', 'order-2'],
      );
    });

    it('doFind: filters on a joined column across a composite key, from both sides', async () => {
      const orders = await ctx.repo('tenantOrder').find({
        join: [{ relation: 'lines' }],
        where: Where.rel('lines', Where.eq('qty', 3)),
      });
      const lines = await ctx.repo('tenantOrderLine').find({
        join: [{ relation: 'order' }],
        where: Where.rel('order', Where.eq('total', 10)),
      });

      assert.deepStrictEqual(valuesOf(orders, 'id'), ['order-2']);
      assert.deepStrictEqual(valuesOf(lines, 'id'), ['line-1', 'line-2']);
    });
  });
}
