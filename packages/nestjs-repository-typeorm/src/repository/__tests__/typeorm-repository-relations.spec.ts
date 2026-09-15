import { mockRelationMetadata } from '../../__fixtures__/repository/mock/relation-metadata.mock.js';
import { mockTypeOrmRepository } from '../../__fixtures__/repository/mock/typeorm-repository.mock.js';
import { buildRelations } from '../typeorm-options.schema.js';

// ═══════════════════════════════════════════════════════════════════════════
// buildRelations — pure function, mocked RelationMetadata
// ═══════════════════════════════════════════════════════════════════════════

describe('buildRelations', () => {
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

    const result = buildRelations([rel]);
    expect(result).toEqual([
      {
        name: 'author',
        targetEntity: 'AuthorEntity',
        cardinality: 'one',
        on: { from: 'authorId', to: 'id' },
      },
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

    const result = buildRelations([rel]);
    expect(result).toEqual([
      {
        name: 'posts',
        targetEntity: 'PostEntity',
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
      junctionEntityMetadata: { name: 'post_tags' },
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

    const result = buildRelations([rel]);
    expect(result).toEqual([
      {
        name: 'tags',
        targetEntity: 'TagEntity',
        cardinality: 'many',
        on: { from: 'id', to: 'id' },
        through: {
          relation: 'post_tags',
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
        junctionEntityMetadata: { name: 'post_tags' },
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

    const result = buildRelations([rel]);
    expect(result).toEqual([
      {
        name: 'posts',
        targetEntity: 'PostEntity',
        cardinality: 'many',
        on: { from: 'id', to: 'id' },
        through: {
          relation: 'post_tags',
          fromKey: 'tagId',
          toKey: 'postId',
        },
      },
    ]);
  });

  it('should skip owning relation with no joinColumns', () => {
    const rel = mockRelationMetadata({
      propertyName: 'broken',
      inverseEntityMetadata: { name: 'OtherEntity' },
      isOwning: true,
      joinColumns: [],
    });

    expect(buildRelations([rel])).toEqual([]);
  });

  it('should skip non-owning relation with no inverseRelation', () => {
    const rel = mockRelationMetadata({
      propertyName: 'broken',
      inverseEntityMetadata: { name: 'OtherEntity' },
      isOneToMany: true,
      isOwning: false,
      inverseRelation: undefined,
    });

    expect(buildRelations([rel])).toEqual([]);
  });

  it('should skip M2M owning relation with no junctionEntityMetadata', () => {
    const rel = mockRelationMetadata({
      propertyName: 'tags',
      inverseEntityMetadata: { name: 'TagEntity' },
      isManyToMany: true,
      isManyToManyOwner: true,
      junctionEntityMetadata: undefined,
    });

    expect(buildRelations([rel])).toEqual([]);
  });

  it('should skip M2M owning relation with no inverseJoinColumns', () => {
    const rel = mockRelationMetadata({
      propertyName: 'tags',
      inverseEntityMetadata: { name: 'TagEntity' },
      isManyToMany: true,
      isManyToManyOwner: true,
      junctionEntityMetadata: { name: 'post_tags' },
      joinColumns: [
        {
          propertyName: 'postId',
          referencedColumn: { propertyName: 'id' },
        },
      ],
      inverseJoinColumns: [],
    });

    expect(buildRelations([rel])).toEqual([]);
  });

  it('should skip M2M non-owning relation with no inverseRelation', () => {
    const rel = mockRelationMetadata({
      propertyName: 'posts',
      inverseEntityMetadata: { name: 'PostEntity' },
      isManyToMany: true,
      isManyToManyOwner: false,
      inverseRelation: undefined,
    });

    expect(buildRelations([rel])).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(buildRelations([])).toEqual([]);
  });

  it('should merge relationsConfig onDelete into mapped relation', () => {
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

    const result = buildRelations([rel], {
      posts: { onDelete: 'delegate' },
    });

    expect(result).toEqual([
      {
        name: 'posts',
        targetEntity: 'PostEntity',
        cardinality: 'many',
        on: { from: 'id', to: 'authorId' },
        onDelete: 'delegate',
        onUpdate: undefined,
      },
    ]);
  });

  it('should merge relationsConfig onUpdate into mapped relation', () => {
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

    const result = buildRelations([rel], {
      author: { onUpdate: 'delegate' },
    });

    expect(result).toEqual([
      {
        name: 'author',
        targetEntity: 'AuthorEntity',
        cardinality: 'one',
        on: { from: 'authorId', to: 'id' },
        onDelete: undefined,
        onUpdate: 'delegate',
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

    const result = buildRelations([rel], {
      posts: { onDelete: 'delegate' },
    });

    expect(result).toEqual([
      {
        name: 'author',
        targetEntity: 'AuthorEntity',
        cardinality: 'one',
        on: { from: 'authorId', to: 'id' },
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

    const result = buildRelations([owning, nonOwning], {
      comments: { onDelete: 'delegate' },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'author',
      targetEntity: 'AuthorEntity',
      cardinality: 'one',
      on: { from: 'authorId', to: 'id' },
    });
    expect(result[1]).toEqual({
      name: 'comments',
      targetEntity: 'CommentEntity',
      cardinality: 'many',
      on: { from: 'id', to: 'postId' },
      onDelete: 'delegate',
      onUpdate: undefined,
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

    const result = buildRelations([rel], {
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
        cardinality: 'many',
        on: { from: 'id', to: 'authorId' },
        onDelete: undefined,
        onUpdate: undefined,
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

    const result = buildRelations([owning, nonOwning]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('author');
    expect(result[1].name).toBe('comments');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// translateJoin — minimal mock TypeORM repo
// ═══════════════════════════════════════════════════════════════════════════

describe('translateJoin', () => {
  let typeormRepo: ReturnType<typeof mockTypeOrmRepository>;

  beforeAll(() => {
    typeormRepo = mockTypeOrmRepository();
  });

  it('should translate single join to relations object', () => {
    const result = typeormRepo['translateJoin']([{ relation: 'posts' }]);
    expect(result).toEqual({ posts: true });
  });

  it('should translate multiple joins', () => {
    const result = typeormRepo['translateJoin']([
      { relation: 'author' },
      { relation: 'tags' },
    ]);
    expect(result).toEqual({ author: true, tags: true });
  });

  it('should return undefined for empty array', () => {
    expect(typeormRepo['translateJoin']([])).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(typeormRepo['translateJoin'](undefined)).toBeUndefined();
  });
});
