import { type RepositoryRelationMetadataInterface } from '../../repository/interfaces/repository-relation-metadata.interface.js';
import { assert } from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';
import { type ConformanceFixturesInterface } from '../interfaces/conformance-fixtures.interface.js';

type ColumnFlags = {
  name: string;
  isPrimary: boolean;
  isRemoveDate: boolean;
  isVersion: boolean;
};

type ColumnPair = { from: string; to: string };

/** What these cases read of any entity's metadata. */
type ReportedMetadata = {
  name: string;
  columns: ColumnFlags[];
  relations?: RepositoryRelationMetadataInterface[];
};

const column = (
  name: string,
  flags: Partial<Omit<ColumnFlags, 'name'>> = {},
): ColumnFlags => ({
  name,
  isPrimary: flags.isPrimary ?? false,
  isRemoveDate: flags.isRemoveDate ?? false,
  isVersion: flags.isVersion ?? false,
});

/**
 * Every fixture's own columns and their flags, sorted by name. `removedAt`
 * is the remove date only where the driver supports soft delete.
 */
function columnsFor(
  softDelete: boolean,
): Record<keyof ConformanceFixturesInterface, ColumnFlags[]> {
  const removedAt = column('removedAt', { isRemoveDate: softDelete });
  const bookColumns = [
    column('authorId'),
    column('id', { isPrimary: true }),
    removedAt,
    column('title'),
  ];

  return {
    item: [
      column('id', { isPrimary: true }),
      column('name'),
      column('note'),
      column('rank'),
      removedAt,
      column('version', { isVersion: true }),
    ],
    plainItem: [column('id', { isPrimary: true }), column('name')],
    author: [column('id', { isPrimary: true }), column('name'), removedAt],
    award: [
      column('authorId'),
      column('id', { isPrimary: true }),
      column('name'),
    ],
    book: bookColumns,
    bookWithEagerAuthor: bookColumns,
    tag: [column('id', { isPrimary: true }), column('label')],
    tenantOrder: [
      column('id', { isPrimary: true }),
      column('tenantId'),
      column('total'),
    ],
    tenantOrderLine: [
      column('id', { isPrimary: true }),
      column('orderId'),
      column('qty'),
      column('tenantId'),
    ],
  };
}

/** Every fixture's declared relations, sorted. */
const RELATIONS: Record<keyof ConformanceFixturesInterface, string[]> = {
  item: [],
  plainItem: [],
  author: ['awards', 'books'],
  award: ['author'],
  book: ['author', 'tags'],
  bookWithEagerAuthor: ['author'],
  tag: ['books'],
  tenantOrder: ['lines'],
  tenantOrderLine: ['order'],
};

const KEYS: (keyof ConformanceFixturesInterface)[] = [
  'item',
  'plainItem',
  'author',
  'award',
  'book',
  'bookWithEagerAuthor',
  'tag',
  'tenantOrder',
  'tenantOrderLine',
];

function flagsOf(metadata: ReportedMetadata): ColumnFlags[] {
  return metadata.columns
    .map(({ name, isPrimary, isRemoveDate, isVersion }) => ({
      name,
      isPrimary,
      isRemoveDate,
      isVersion,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function sortPairs(pairs: ColumnPair[] | undefined): ColumnPair[] | undefined {
  return pairs
    ?.map(({ from, to }) => ({ from, to }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

function relationOf(
  metadata: ReportedMetadata,
  name: string,
): RepositoryRelationMetadataInterface {
  const relation = metadata.relations?.find((found) => found.name === name);
  assert.ok(relation, `${metadata.name} reports no relation "${name}"`);
  return relation;
}

/** The pairs a join of `relation` matches: `joinOn`, or `[on]` when absent. */
function joinPairs(
  relation: RepositoryRelationMetadataInterface,
): ColumnPair[] | undefined {
  return sortPairs(relation.joinOn ?? [relation.on]);
}

/**
 * What a driver reports about each entity: names, URNs, own columns and
 * their flags, and relations.
 */
export function metadataSection(ctx: ConformanceContext): void {
  const { it } = ctx.test;
  const columns = columnsFor(ctx.capabilities.softDelete === 'supported');

  it('metadata: names each entity by its class', () => {
    for (const key of KEYS) {
      const { metadata } = ctx.repo(key);
      const { entity } = ctx.fixtures[key];

      assert.equal(metadata.name, entity.name);
      assert.equal(metadata.type, entity);
    }
  });

  it('metadata: gives each entity its own URN', () => {
    const urns = KEYS.map((key) => ctx.repo(key).metadata.urn);

    for (const urn of urns) {
      assert.match(urn, /^urn:/);
    }
    assert.equal(new Set(urns).size, KEYS.length);
  });

  it('metadata: reports exactly the own columns, with their flags', () => {
    for (const key of KEYS) {
      assert.deepStrictEqual(
        flagsOf(ctx.repo(key).metadata),
        columns[key],
        `${key} columns`,
      );
    }
  });

  it('metadata: reports exactly the declared relations', () => {
    for (const key of KEYS) {
      const names = (ctx.repo(key).metadata.relations ?? [])
        .map(({ name }) => name)
        .sort();

      assert.deepStrictEqual(names, RELATIONS[key], `${key} relations`);
    }
  });

  it("metadata: reports each relation's target by its URN and own columns", () => {
    const targets: [
      keyof ConformanceFixturesInterface,
      string,
      keyof ConformanceFixturesInterface,
    ][] = [
      ['book', 'author', 'author'],
      ['bookWithEagerAuthor', 'author', 'author'],
      ['author', 'books', 'book'],
      ['author', 'awards', 'award'],
      ['award', 'author', 'author'],
      ['book', 'tags', 'tag'],
      ['tag', 'books', 'book'],
      ['tenantOrder', 'lines', 'tenantOrderLine'],
      ['tenantOrderLine', 'order', 'tenantOrder'],
    ];

    for (const [key, name, target] of targets) {
      const relation = relationOf(ctx.repo(key).metadata, name);
      const targetMetadata = ctx.repo(target).metadata;

      assert.equal(relation.targetUrn, targetMetadata.urn, `${key}.${name}`);
      assert.equal(
        relation.targetEntity,
        targetMetadata.name,
        `${key}.${name} target entity`,
      );
      assert.deepStrictEqual(
        flagsOf({ name: target, columns: relation.targetColumns }),
        columns[target],
        `${key}.${name} target columns`,
      );
    }
  });

  it('metadata: reports a to-one relation by the foreign key it holds', () => {
    const relation = relationOf(ctx.repo('book').metadata, 'author');

    assert.equal(relation.cardinality, 'one');
    assert.deepStrictEqual(relation.on, { from: 'authorId', to: 'id' });
    assert.deepStrictEqual(joinPairs(relation), [
      { from: 'authorId', to: 'id' },
    ]);
    assert.deepStrictEqual(sortPairs(relation.foreignKey), [
      { from: 'authorId', to: 'id' },
    ]);
  });

  it('metadata: reports the to-many side of a foreign key swapped, holding none', () => {
    const relation = relationOf(ctx.repo('author').metadata, 'books');

    assert.equal(relation.cardinality, 'many');
    assert.deepStrictEqual(relation.on, { from: 'id', to: 'authorId' });
    assert.deepStrictEqual(joinPairs(relation), [
      { from: 'id', to: 'authorId' },
    ]);
    assert.equal(relation.foreignKey, undefined);
  });

  it('metadata: reports both sides of a many-to-many relation through one junction', () => {
    const tags = relationOf(ctx.repo('book').metadata, 'tags');
    const books = relationOf(ctx.repo('tag').metadata, 'books');

    assert.equal(tags.cardinality, 'many');
    assert.equal(books.cardinality, 'many');
    assert.ok(tags.through, 'book.tags reports no junction');
    assert.ok(books.through, 'tag.books reports no junction');
    assert.equal(tags.through.urn, books.through.urn);
    assert.match(tags.through.urn, /^urn:/);
    assert.notEqual(tags.through.urn, ctx.repo('book').metadata.urn);
    assert.notEqual(tags.through.urn, ctx.repo('tag').metadata.urn);
    assert.equal(tags.through.fromKey, books.through.toKey);
    assert.equal(tags.through.toKey, books.through.fromKey);
    assert.notEqual(tags.through.fromKey, tags.through.toKey);
  });

  it('metadata: reports every column pair of a composite foreign key', () => {
    const order = relationOf(ctx.repo('tenantOrderLine').metadata, 'order');
    const lines = relationOf(ctx.repo('tenantOrder').metadata, 'lines');

    assert.equal(order.cardinality, 'one');
    assert.deepStrictEqual(order.on, { from: 'orderId', to: 'id' });
    assert.deepStrictEqual(joinPairs(order), [
      { from: 'orderId', to: 'id' },
      { from: 'tenantId', to: 'tenantId' },
    ]);
    assert.deepStrictEqual(sortPairs(order.foreignKey), joinPairs(order));

    assert.equal(lines.cardinality, 'many');
    assert.deepStrictEqual(lines.on, { from: 'id', to: 'orderId' });
    assert.deepStrictEqual(joinPairs(lines), [
      { from: 'id', to: 'orderId' },
      { from: 'tenantId', to: 'tenantId' },
    ]);
    assert.equal(lines.foreignKey, undefined);
  });
}
