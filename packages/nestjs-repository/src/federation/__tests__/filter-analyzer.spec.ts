import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../repository/repository.types.js';
import { FederationException } from '../exceptions/federation.exception.js';
import { type FederatedRelation } from '../federation.types.js';
import { FilterAnalyzer } from '../filter-analyzer.js';

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

describe('FilterAnalyzer', () => {
  const posts = makeRelation({ name: 'posts' });
  const comments = makeRelation({ name: 'comments' });

  describe('extractRelationConditions', () => {
    it('should pass through root-only where clause unchanged', () => {
      const where = {
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'test',
      };
      const analyzer = new FilterAnalyzer(where, [posts], new Set());

      expect(analyzer.getRootWhere()).toEqual(where);
      expect(analyzer.getRelationConditions(posts)).toEqual([]);
    });

    it('should extract relation-tagged condition from root', () => {
      const where = {
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'name', operator: WhereOperator.EQ, value: 'test' },
          {
            field: 'title',
            operator: WhereOperator.EQ,
            value: 'hello',
            relation: 'posts',
          },
        ],
      };
      const analyzer = new FilterAnalyzer(where, [posts], new Set());

      expect(analyzer.getRootWhere()).toEqual({
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'test',
      });
      expect(analyzer.getRelationConditions(posts)).toEqual([
        {
          field: 'title',
          operator: WhereOperator.EQ,
          value: 'hello',
          relation: 'posts',
        },
      ]);
    });

    it('should return undefined root where when all conditions are relation-tagged', () => {
      const where = {
        field: 'title',
        operator: WhereOperator.EQ,
        value: 'hello',
        relation: 'posts',
      };
      const analyzer = new FilterAnalyzer(where, [posts], new Set());

      expect(analyzer.getRootWhere()).toBeUndefined();
      expect(analyzer.getRelationConditions(posts)).toHaveLength(1);
    });

    it('should throw on relation condition inside OR compound', () => {
      const where = {
        operator: WhereCompoundOperator.OR,
        conditions: [
          { field: 'name', operator: WhereOperator.EQ, value: 'a' },
          {
            field: 'title',
            operator: WhereOperator.EQ,
            value: 'b',
            relation: 'posts',
          },
        ],
      };

      expect(() => new FilterAnalyzer(where, [posts], new Set())).toThrow(
        FederationException,
      );
    });

    it('should handle nested AND compounds', () => {
      const where = {
        operator: WhereCompoundOperator.AND,
        conditions: [
          {
            operator: WhereCompoundOperator.AND,
            conditions: [
              {
                field: 'title',
                operator: WhereOperator.EQ,
                value: 'x',
                relation: 'posts',
              },
              {
                field: 'body',
                operator: WhereOperator.CONTAINS,
                value: 'y',
                relation: 'comments',
              },
            ],
          },
          { field: 'active', operator: WhereOperator.EQ, value: true },
        ],
      };
      const analyzer = new FilterAnalyzer(where, [posts, comments], new Set());

      expect(analyzer.getRootWhere()).toEqual({
        field: 'active',
        operator: WhereOperator.EQ,
        value: true,
      });
      expect(analyzer.getRelationConditions(posts)).toHaveLength(1);
      expect(analyzer.getRelationConditions(comments)).toHaveLength(1);
    });

    it('should handle undefined where clause', () => {
      const analyzer = new FilterAnalyzer(undefined, [posts], new Set());

      expect(analyzer.getRootWhere()).toBeUndefined();
      expect(analyzer.getRelationConditions(posts)).toEqual([]);
    });
  });

  describe('INNER JOIN injection', () => {
    it('should inject NOT_NULL on root FK for owning INNER JOIN', () => {
      const owningRelation = makeRelation({
        name: 'profile',
        cardinality: 'one',
        isOwning: true,
        joinType: 'INNER',
        on: { from: 'profileId', to: 'id' },
      });

      const analyzer = new FilterAnalyzer(
        undefined,
        [owningRelation],
        new Set(),
      );

      expect(analyzer.getRootWhere()).toEqual({
        field: 'profileId',
        operator: WhereOperator.NOT_NULL,
      });
    });

    it('should inject NOT_NULL on target FK for non-owning INNER JOIN', () => {
      const nonOwning = makeRelation({
        name: 'posts',
        joinType: 'INNER',
      });

      const analyzer = new FilterAnalyzer(undefined, [nonOwning], new Set());

      expect(analyzer.getRelationConditions(nonOwning)).toEqual([
        {
          field: 'postsId',
          operator: WhereOperator.NOT_NULL,
          relation: 'posts',
        },
      ]);
    });

    it('should inject NOT_NULL for sorted relations (treated as INNER)', () => {
      const analyzer = new FilterAnalyzer(
        undefined,
        [posts],
        new Set(['posts']),
      );

      expect(analyzer.getRelationConditions(posts)).toEqual([
        {
          field: 'postsId',
          operator: WhereOperator.NOT_NULL,
          relation: 'posts',
        },
      ]);
    });
  });

  describe('distinctFilter injection', () => {
    it('should add distinctFilter as relation condition', () => {
      const withDistinct = makeRelation({
        name: 'posts',
        distinctFilter: {
          field: 'published',
          operator: WhereOperator.EQ,
          value: true,
        },
      });

      const analyzer = new FilterAnalyzer(undefined, [withDistinct], new Set());

      expect(analyzer.getRelationConditions(withDistinct)).toEqual([
        {
          field: 'published',
          operator: WhereOperator.EQ,
          value: true,
          relation: 'posts',
        },
      ]);
    });
  });

  describe('hasFiltersForRelation / hasRelationFilters', () => {
    it('should detect relation filters', () => {
      const where = {
        field: 'title',
        operator: WhereOperator.EQ,
        value: 'hello',
        relation: 'posts',
      };
      const analyzer = new FilterAnalyzer(where, [posts, comments], new Set());

      expect(analyzer.hasFiltersForRelation(posts)).toBe(true);
      expect(analyzer.hasFiltersForRelation(comments)).toBe(false);
      expect(analyzer.hasRelationFilters([posts, comments])).toBe(true);
    });
  });

  describe('buildConstraint', () => {
    it('should return undefined for empty values', () => {
      expect(FilterAnalyzer.buildConstraint('id', [])).toBeUndefined();
    });

    it('should return EQ for single value', () => {
      expect(FilterAnalyzer.buildConstraint('id', [1])).toEqual({
        field: 'id',
        operator: WhereOperator.EQ,
        value: 1,
      });
    });

    it('should return IN for multiple values', () => {
      expect(FilterAnalyzer.buildConstraint('id', [1, 2, 3])).toEqual({
        field: 'id',
        operator: WhereOperator.IN,
        value: [1, 2, 3],
      });
    });
  });

  describe('buildWhereClause', () => {
    it('should return undefined for empty conditions', () => {
      expect(FilterAnalyzer.buildWhereClause([])).toBeUndefined();
    });

    it('should return single condition unwrapped', () => {
      const condition = {
        field: 'id',
        operator: WhereOperator.EQ,
        value: 1,
      };
      expect(FilterAnalyzer.buildWhereClause([condition])).toEqual(condition);
    });

    it('should wrap multiple conditions in AND compound', () => {
      const a = { field: 'a', operator: WhereOperator.EQ, value: 1 };
      const b = { field: 'b', operator: WhereOperator.EQ, value: 2 };
      expect(FilterAnalyzer.buildWhereClause([a, b])).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [a, b],
      });
    });
  });
});
