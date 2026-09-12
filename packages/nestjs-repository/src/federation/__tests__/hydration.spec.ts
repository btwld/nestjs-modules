import { type PlainLiteralObject } from '@nestjs/common';

import {
  type FederatedRelation,
  type RelationResult,
} from '../federation.types.js';
import { hydrateRelations, initializeEmptyRelations } from '../hydration.js';

const makeRelation = (
  overrides: Partial<FederatedRelation> & { name: string },
): FederatedRelation => ({
  targetEntity: `${overrides.name}Entity`,
  cardinality: 'many',
  on: { from: 'id', to: `${overrides.name}Id` },
  isOwning: false,
  joinType: 'LEFT',
  ...overrides,
});

describe('hydrateRelations', () => {
  describe('non-owning many-cardinality', () => {
    const posts = makeRelation({
      name: 'posts',
      cardinality: 'many',
      on: { from: 'id', to: 'userId' },
    });

    it('should assign matching targets to roots', () => {
      const roots: PlainLiteralObject[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const results: RelationResult[] = [
        {
          relation: posts,
          data: [
            { id: 10, userId: 1, title: 'Post A' },
            { id: 11, userId: 1, title: 'Post B' },
            { id: 12, userId: 2, title: 'Post C' },
          ],
          total: 3,
        },
      ];

      hydrateRelations(roots, 'id', results);

      expect(roots[0].posts).toEqual([
        { id: 10, userId: 1, title: 'Post A' },
        { id: 11, userId: 1, title: 'Post B' },
      ]);
      expect(roots[1].posts).toEqual([{ id: 12, userId: 2, title: 'Post C' }]);
    });

    it('should initialize empty array for roots with no matches', () => {
      const roots: PlainLiteralObject[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const results: RelationResult[] = [
        {
          relation: posts,
          data: [{ id: 10, userId: 1, title: 'Post A' }],
          total: 1,
        },
      ];

      hydrateRelations(roots, 'id', results);

      expect(roots[0].posts).toEqual([{ id: 10, userId: 1, title: 'Post A' }]);
      expect(roots[1].posts).toEqual([]);
    });
  });

  describe('non-owning one-cardinality', () => {
    const profile = makeRelation({
      name: 'profile',
      cardinality: 'one',
      on: { from: 'id', to: 'userId' },
    });

    it('should assign single target to root', () => {
      const roots: PlainLiteralObject[] = [{ id: 1, name: 'Alice' }];
      const results: RelationResult[] = [
        {
          relation: profile,
          data: [{ id: 5, userId: 1, bio: 'Hello' }],
          total: 1,
        },
      ];

      hydrateRelations(roots, 'id', results);

      expect(roots[0].profile).toEqual({
        id: 5,
        userId: 1,
        bio: 'Hello',
      });
    });

    it('should initialize null for roots with no matches', () => {
      const roots: PlainLiteralObject[] = [{ id: 1, name: 'Alice' }];
      const results: RelationResult[] = [
        { relation: profile, data: [], total: 0 },
      ];

      hydrateRelations(roots, 'id', results);

      expect(roots[0].profile).toBeNull();
    });
  });

  describe('owning one-cardinality', () => {
    const blog = makeRelation({
      name: 'blog',
      cardinality: 'one',
      isOwning: true,
      on: { from: 'blogId', to: 'id' },
    });

    it('should match via root FK to target PK', () => {
      const roots: PlainLiteralObject[] = [
        { id: 1, blogId: 100 },
        { id: 2, blogId: 200 },
      ];
      const results: RelationResult[] = [
        {
          relation: blog,
          data: [
            { id: 100, title: 'Blog A' },
            { id: 200, title: 'Blog B' },
          ],
          total: 2,
        },
      ];

      hydrateRelations(roots, 'id', results);

      expect(roots[0].blog).toEqual({ id: 100, title: 'Blog A' });
      expect(roots[1].blog).toEqual({ id: 200, title: 'Blog B' });
    });

    it('should leave null when FK is null', () => {
      const roots: PlainLiteralObject[] = [{ id: 1, blogId: null }];
      const results: RelationResult[] = [
        { relation: blog, data: [], total: 0 },
      ];

      hydrateRelations(roots, 'id', results);

      expect(roots[0].blog).toBeNull();
    });
  });

  describe('owning many-cardinality', () => {
    const tags = makeRelation({
      name: 'tags',
      cardinality: 'many',
      isOwning: true,
      on: { from: 'tagGroupId', to: 'groupId' },
    });

    it('should group targets by root FK value', () => {
      const roots: PlainLiteralObject[] = [
        { id: 1, tagGroupId: 'g1' },
        { id: 2, tagGroupId: 'g1' },
      ];
      const results: RelationResult[] = [
        {
          relation: tags,
          data: [
            { id: 10, groupId: 'g1', label: 'Tag A' },
            { id: 11, groupId: 'g1', label: 'Tag B' },
          ],
          total: 2,
        },
      ];

      hydrateRelations(roots, 'id', results);

      expect(roots[0].tags).toEqual([
        { id: 10, groupId: 'g1', label: 'Tag A' },
        { id: 11, groupId: 'g1', label: 'Tag B' },
      ]);
      expect(roots[1].tags).toEqual([
        { id: 10, groupId: 'g1', label: 'Tag A' },
        { id: 11, groupId: 'g1', label: 'Tag B' },
      ]);
    });
  });

  it('should handle empty roots', () => {
    const posts = makeRelation({ name: 'posts' });
    const roots: PlainLiteralObject[] = [];
    hydrateRelations(roots, 'id', [{ relation: posts, data: [], total: 0 }]);
    expect(roots).toEqual([]);
  });

  it('should handle multiple relations', () => {
    const posts = makeRelation({
      name: 'posts',
      cardinality: 'many',
      on: { from: 'id', to: 'userId' },
    });
    const profile = makeRelation({
      name: 'profile',
      cardinality: 'one',
      on: { from: 'id', to: 'userId' },
    });

    const roots: PlainLiteralObject[] = [{ id: 1, name: 'Alice' }];
    const results: RelationResult[] = [
      {
        relation: posts,
        data: [{ id: 10, userId: 1, title: 'Post' }],
        total: 1,
      },
      {
        relation: profile,
        data: [{ id: 5, userId: 1, bio: 'Hello' }],
        total: 1,
      },
    ];

    hydrateRelations(roots, 'id', results);

    expect(roots[0].posts).toEqual([{ id: 10, userId: 1, title: 'Post' }]);
    expect(roots[0].profile).toEqual({ id: 5, userId: 1, bio: 'Hello' });
  });
});

describe('initializeEmptyRelations', () => {
  const posts = makeRelation({ name: 'posts', cardinality: 'many' });
  const profile = makeRelation({ name: 'profile', cardinality: 'one' });

  it('should set defaults based on cardinality', () => {
    const roots: PlainLiteralObject[] = [{ id: 1 }, { id: 2 }];
    initializeEmptyRelations(roots, [posts, profile]);

    expect(roots[0].posts).toEqual([]);
    expect(roots[0].profile).toBeNull();
    expect(roots[1].posts).toEqual([]);
    expect(roots[1].profile).toBeNull();
  });

  it('should skip existing properties when onlyIfMissing is true', () => {
    const roots: PlainLiteralObject[] = [{ id: 1, posts: [{ id: 10 }] }];
    initializeEmptyRelations(roots, [posts, profile], true);

    expect(roots[0].posts).toEqual([{ id: 10 }]);
    expect(roots[0].profile).toBeNull();
  });
});
