import { RuntimeException } from '@concepta/nestjs-core';
import { type OrderClause } from '@concepta/nestjs-repository';

import { mockRelationMetadata } from '../../__fixtures__/repository/mock/relation-metadata.mock.js';
import { TypeOrmRelationMetadataException } from '../../exceptions/typeorm-relation-metadata.exception.js';
import {
  buildOrder,
  buildRelations,
  buildSelect,
} from '../typeorm-options.schema.js';

// ═══════════════════════════════════════════════════════════════════════════
// buildRelations — pure function, mocked RelationMetadata
// ═══════════════════════════════════════════════════════════════════════════

const SOURCE = 'shop';

describe('buildRelations', () => {
  it("should name each target's and junction's rows by database and table", () => {
    const owning = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: { name: 'AuthorEntity', tableName: 'people' },
      isOwning: true,
      joinColumns: [
        { propertyName: 'authorId', referencedColumn: { propertyName: 'id' } },
      ],
    });
    const manyToMany = mockRelationMetadata({
      propertyName: 'tags',
      inverseEntityMetadata: { name: 'TagEntity', tableName: 'tags' },
      isManyToMany: true,
      isManyToManyOwner: true,
      junctionEntityMetadata: { tableName: 'post_tags' },
      joinColumns: [
        { propertyName: 'postId', referencedColumn: { propertyName: 'id' } },
      ],
      inverseJoinColumns: [
        { propertyName: 'tagId', referencedColumn: { propertyName: 'id' } },
      ],
    });

    const [author, tags] = buildRelations([owning, manyToMany], 'ledger');

    expect(author?.targetUrn).toBe('urn:typeorm:ledger:people');
    expect(tags?.targetUrn).toBe('urn:typeorm:ledger:tags');
    expect(tags?.through?.urn).toBe('urn:typeorm:ledger:post_tags');
  });

  it('should name a target by its own database where it gives one', () => {
    const rel = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: { name: 'AuthorEntity', database: 'crm' },
      isOwning: true,
      joinColumns: [
        { propertyName: 'authorId', referencedColumn: { propertyName: 'id' } },
      ],
    });

    expect(buildRelations([rel], 'ledger')[0]?.targetUrn).toBe(
      'urn:typeorm:crm:AuthorEntity',
    );
  });

  it('should leave the database empty when none is known', () => {
    const rel = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: { name: 'AuthorEntity' },
      isOwning: true,
      joinColumns: [
        { propertyName: 'authorId', referencedColumn: { propertyName: 'id' } },
      ],
    });

    expect(buildRelations([rel], undefined)[0]?.targetUrn).toBe(
      'urn:typeorm::AuthorEntity',
    );
  });

  it('should map owning-side ManyToOne relation', () => {
    const rel = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: { name: 'AuthorEntity' },
      isOwning: true,
      joinColumns: [
        {
          propertyName: 'authorId',
          referencedColumn: { propertyName: 'id' },
        },
      ],
    });

    const result = buildRelations([rel], SOURCE);
    expect(result).toEqual([
      {
        name: 'author',
        targetEntity: 'AuthorEntity',
        targetUrn: 'urn:typeorm:shop:AuthorEntity',
        targetColumns: [],
        cardinality: 'one',
        on: { from: 'authorId', to: 'id' },
        foreignKey: [{ from: 'authorId', to: 'id' }],
      },
    ]);
  });

  it('should report every column of a composite foreign key', () => {
    const rel = mockRelationMetadata({
      propertyName: 'doc',
      inverseEntityMetadata: { name: 'DocEntity' },
      isOwning: true,
      joinColumns: [
        { propertyName: 'docId', referencedColumn: { propertyName: 'id' } },
        {
          propertyName: 'docLocale',
          referencedColumn: { propertyName: 'locale' },
        },
      ],
    });

    expect(buildRelations([rel], SOURCE)[0]?.foreignKey).toEqual([
      { from: 'docId', to: 'id' },
      { from: 'docLocale', to: 'locale' },
    ]);
  });

  it('should map non-owning OneToMany relation with swapped on', () => {
    const rel = mockRelationMetadata({
      propertyName: 'posts',
      inverseEntityMetadata: { name: 'PostEntity' },
      isOneToMany: true,
      isOwning: false,
      inverseRelation: {
        joinColumns: [
          {
            propertyName: 'authorId',
            referencedColumn: { propertyName: 'id' },
          },
        ],
      },
    });

    const result = buildRelations([rel], SOURCE);
    expect(result).toEqual([
      {
        name: 'posts',
        targetEntity: 'PostEntity',
        targetUrn: 'urn:typeorm:shop:PostEntity',
        targetColumns: [],
        cardinality: 'many',
        on: { from: 'id', to: 'authorId' },
      },
    ]);
  });

  it('should map owning-side ManyToMany relation with through', () => {
    const rel = mockRelationMetadata({
      propertyName: 'tags',
      inverseEntityMetadata: { name: 'TagEntity' },
      isManyToMany: true,
      isManyToManyOwner: true,
      junctionEntityMetadata: { tableName: 'post_tags' },
      joinColumns: [
        {
          propertyName: 'postId',
          referencedColumn: { propertyName: 'id' },
        },
      ],
      inverseJoinColumns: [
        {
          propertyName: 'tagId',
          referencedColumn: { propertyName: 'id' },
        },
      ],
    });

    const result = buildRelations([rel], SOURCE);
    expect(result).toEqual([
      {
        name: 'tags',
        targetEntity: 'TagEntity',
        targetUrn: 'urn:typeorm:shop:TagEntity',
        targetColumns: [],
        cardinality: 'many',
        on: { from: 'id', to: 'id' },
        through: {
          urn: 'urn:typeorm:shop:post_tags',
          fromKey: 'postId',
          toKey: 'tagId',
        },
      },
    ]);
  });

  it('should map non-owning ManyToMany relation with swapped through', () => {
    const rel = mockRelationMetadata({
      propertyName: 'posts',
      inverseEntityMetadata: { name: 'PostEntity' },
      isManyToMany: true,
      isManyToManyOwner: false,
      inverseRelation: {
        junctionEntityMetadata: { tableName: 'post_tags' },
        joinColumns: [
          {
            propertyName: 'postId',
            referencedColumn: { propertyName: 'id' },
          },
        ],
        inverseJoinColumns: [
          {
            propertyName: 'tagId',
            referencedColumn: { propertyName: 'id' },
          },
        ],
      },
    });

    const result = buildRelations([rel], SOURCE);
    expect(result).toEqual([
      {
        name: 'posts',
        targetEntity: 'PostEntity',
        targetUrn: 'urn:typeorm:shop:PostEntity',
        targetColumns: [],
        cardinality: 'many',
        on: { from: 'id', to: 'id' },
        through: {
          urn: 'urn:typeorm:shop:post_tags',
          fromKey: 'tagId',
          toKey: 'postId',
        },
      },
    ]);
  });

  /**
   * A relation missing from the metadata would be invisible to the
   * repository's relation-write guard, so an unmappable one refuses to build
   * rather than being skipped.
   */
  it.each([
    [
      'an owning relation with no join columns',
      mockRelationMetadata({
        propertyName: 'broken',
        inverseEntityMetadata: { name: 'OtherEntity' },
        isOwning: true,
        joinColumns: [],
      }),
    ],
    [
      'an owning relation with an unreferenced join column',
      mockRelationMetadata({
        propertyName: 'broken',
        inverseEntityMetadata: { name: 'OtherEntity' },
        isOwning: true,
        joinColumns: [{ propertyName: 'otherId' }],
      }),
    ],
    [
      'a non-owning relation with no inverse',
      mockRelationMetadata({
        propertyName: 'broken',
        inverseEntityMetadata: { name: 'OtherEntity' },
        isOneToMany: true,
        isOwning: false,
        inverseRelation: undefined,
      }),
    ],
    [
      'an M2M owning relation with no junction',
      mockRelationMetadata({
        propertyName: 'broken',
        inverseEntityMetadata: { name: 'TagEntity' },
        isManyToMany: true,
        isManyToManyOwner: true,
        junctionEntityMetadata: undefined,
      }),
    ],
    [
      'an M2M owning relation with no inverse join columns',
      mockRelationMetadata({
        propertyName: 'broken',
        inverseEntityMetadata: { name: 'TagEntity' },
        isManyToMany: true,
        isManyToManyOwner: true,
        junctionEntityMetadata: { tableName: 'post_tags' },
        joinColumns: [
          {
            propertyName: 'postId',
            referencedColumn: { propertyName: 'id' },
          },
        ],
        inverseJoinColumns: [],
      }),
    ],
    [
      'an M2M non-owning relation with no inverse',
      mockRelationMetadata({
        propertyName: 'broken',
        inverseEntityMetadata: { name: 'PostEntity' },
        isManyToMany: true,
        isManyToManyOwner: false,
        inverseRelation: undefined,
      }),
    ],
  ])('should throw on %s', (_case, rel) => {
    expect(() => buildRelations([rel], SOURCE)).toThrow(
      TypeOrmRelationMetadataException,
    );
  });

  it('should return empty array for empty input', () => {
    expect(buildRelations([], SOURCE)).toEqual([]);
  });

  it("should report the target entity's own columns", () => {
    const column = {
      isPrimary: false,
      isDeleteDate: false,
      isVersion: false,
    };
    const rel = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: {
        name: 'AuthorEntity',
        columns: [
          { ...column, propertyName: 'id', isPrimary: true },
          { ...column, propertyName: 'dateDeleted', isDeleteDate: true },
          {
            ...column,
            propertyName: 'teamId',
            relationMetadata: { propertyName: 'team' },
          },
          {
            ...column,
            propertyName: 'mentor',
            relationMetadata: { propertyName: 'mentor' },
          },
        ],
      },
      isOwning: true,
      joinColumns: [
        { propertyName: 'authorId', referencedColumn: { propertyName: 'id' } },
      ],
    });

    expect(buildRelations([rel], SOURCE)[0]?.targetColumns).toEqual([
      { name: 'id', isPrimary: true, isRemoveDate: false, isVersion: false },
      {
        name: 'dateDeleted',
        isPrimary: false,
        isRemoveDate: true,
        isVersion: false,
      },
      {
        name: 'teamId',
        isPrimary: false,
        isRemoveDate: false,
        isVersion: false,
      },
    ]);
  });

  it('should not apply config to relations not in relationsConfig', () => {
    const rel = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: { name: 'AuthorEntity' },
      isOwning: true,
      joinColumns: [
        {
          propertyName: 'authorId',
          referencedColumn: { propertyName: 'id' },
        },
      ],
    });

    const result = buildRelations([rel], SOURCE, {
      posts: { federated: true },
    });

    expect(result).toEqual([
      {
        name: 'author',
        targetEntity: 'AuthorEntity',
        targetUrn: 'urn:typeorm:shop:AuthorEntity',
        targetColumns: [],
        cardinality: 'one',
        on: { from: 'authorId', to: 'id' },
        foreignKey: [{ from: 'authorId', to: 'id' }],
      },
    ]);
  });

  it('should apply config only to matching relations in mixed set', () => {
    const owning = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: { name: 'AuthorEntity' },
      isOwning: true,
      joinColumns: [
        {
          propertyName: 'authorId',
          referencedColumn: { propertyName: 'id' },
        },
      ],
    });

    const nonOwning = mockRelationMetadata({
      propertyName: 'comments',
      inverseEntityMetadata: { name: 'CommentEntity' },
      isOneToMany: true,
      isOwning: false,
      inverseRelation: {
        joinColumns: [
          {
            propertyName: 'postId',
            referencedColumn: { propertyName: 'id' },
          },
        ],
      },
    });

    const result = buildRelations([owning, nonOwning], SOURCE, {
      comments: { federated: true },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'author',
      targetEntity: 'AuthorEntity',
      targetUrn: 'urn:typeorm:shop:AuthorEntity',
      targetColumns: [],
      cardinality: 'one',
      on: { from: 'authorId', to: 'id' },
      foreignKey: [{ from: 'authorId', to: 'id' }],
    });
    expect(result[1]).toEqual({
      name: 'comments',
      targetEntity: 'CommentEntity',
      targetUrn: 'urn:typeorm:shop:CommentEntity',
      targetColumns: [],
      cardinality: 'many',
      on: { from: 'id', to: 'postId' },
      federated: true,
      distinctFilter: undefined,
    });
  });

  it('should merge relationsConfig federation settings into mapped relation', () => {
    const rel = mockRelationMetadata({
      propertyName: 'posts',
      inverseEntityMetadata: { name: 'PostEntity' },
      isOneToMany: true,
      isOwning: false,
      inverseRelation: {
        joinColumns: [
          {
            propertyName: 'authorId',
            referencedColumn: { propertyName: 'id' },
          },
        ],
      },
    });

    const result = buildRelations([rel], SOURCE, {
      posts: {
        federated: true,
        distinctFilter: {
          field: 'published',
          operator: 'eq',
          value: true,
        },
      },
    });

    expect(result).toEqual([
      {
        name: 'posts',
        targetEntity: 'PostEntity',
        targetUrn: 'urn:typeorm:shop:PostEntity',
        targetColumns: [],
        cardinality: 'many',
        on: { from: 'id', to: 'authorId' },
        federated: true,
        distinctFilter: {
          field: 'published',
          operator: 'eq',
          value: true,
        },
      },
    ]);
  });

  it('should map multiple relations', () => {
    const owning = mockRelationMetadata({
      propertyName: 'author',
      inverseEntityMetadata: { name: 'AuthorEntity' },
      isOwning: true,
      joinColumns: [
        {
          propertyName: 'authorId',
          referencedColumn: { propertyName: 'id' },
        },
      ],
    });

    const nonOwning = mockRelationMetadata({
      propertyName: 'comments',
      inverseEntityMetadata: { name: 'CommentEntity' },
      isOneToMany: true,
      isOwning: false,
      inverseRelation: {
        joinColumns: [
          {
            propertyName: 'postId',
            referencedColumn: { propertyName: 'id' },
          },
        ],
      },
    });

    const result = buildRelations([owning, nonOwning], SOURCE);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('author');
    expect(result[1].name).toBe('comments');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildSelect — pure function
// ═══════════════════════════════════════════════════════════════════════════

describe('buildOrder', () => {
  it('should throw on a direction it cannot translate', () => {
    // Parsed from a request, so any string can arrive.
    const order: OrderClause = JSON.parse(
      '[{ "field": "name", "order": "asc" }]',
    );

    expect(() => buildOrder(order)).toThrow(RuntimeException);
  });
});

describe('buildSelect', () => {
  interface SelectableEntity {
    id: string;
    name: string;
  }

  it('should map a column list to the object form TypeORM 1.x requires', () => {
    expect(buildSelect<SelectableEntity>(['id', 'name'])).toEqual({
      id: true,
      name: true,
    });
  });

  it('should return undefined for an empty list, meaning all columns', () => {
    expect(buildSelect<SelectableEntity>([])).toBeUndefined();
  });
});
