import {
  isWhereCondition,
  isWhereCompound,
  isNullaryCondition,
  isArrayCondition,
  isPairCondition,
} from '../interfaces/where-clause.interface.js';
import { WhereOperator, WhereCompoundOperator } from '../repository.types.js';
import { Where } from '../where.helpers.js';

interface TestEntity {
  id: string;
  name: string;
  status: string;
}

describe('Where', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Static scalar operators
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static eq()', () => {
    it('should create an EQ condition', () => {
      const result = Where.eq<TestEntity>('name', 'Alice');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'Alice',
      });
    });
  });

  describe('static ne()', () => {
    it('should create a NE condition', () => {
      const result = Where.ne<TestEntity>('status', 'inactive');
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.NE,
        value: 'inactive',
      });
    });
  });

  describe('static gt()', () => {
    it('should create a GT condition', () => {
      const result = Where.gt('age', 18);
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.GT,
        value: 18,
      });
    });
  });

  describe('static gte()', () => {
    it('should create a GTE condition', () => {
      const result = Where.gte('age', 21);
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.GTE,
        value: 21,
      });
    });
  });

  describe('static lt()', () => {
    it('should create a LT condition', () => {
      const result = Where.lt('age', 65);
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.LT,
        value: 65,
      });
    });
  });

  describe('static lte()', () => {
    it('should create a LTE condition', () => {
      const result = Where.lte('age', 100);
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.LTE,
        value: 100,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static pattern operators
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static contains()', () => {
    it('should create a CONTAINS condition', () => {
      const result = Where.contains<TestEntity>('name', 'lic');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.CONTAINS,
        value: 'lic',
      });
    });
  });

  describe('static notContains()', () => {
    it('should create a NCONTAINS condition', () => {
      const result = Where.notContains<TestEntity>('name', 'bob');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.NCONTAINS,
        value: 'bob',
      });
    });
  });

  describe('static starts()', () => {
    it('should create a STARTS condition', () => {
      const result = Where.starts<TestEntity>('name', 'Al');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.STARTS,
        value: 'Al',
      });
    });
  });

  describe('static notStarts()', () => {
    it('should create a NSTARTS condition', () => {
      const result = Where.notStarts<TestEntity>('name', 'Bo');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.NSTARTS,
        value: 'Bo',
      });
    });
  });

  describe('static ends()', () => {
    it('should create an ENDS condition', () => {
      const result = Where.ends<TestEntity>('name', 'ice');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.ENDS,
        value: 'ice',
      });
    });
  });

  describe('static notEnds()', () => {
    it('should create a NENDS condition', () => {
      const result = Where.notEnds<TestEntity>('name', 'xyz');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.NENDS,
        value: 'xyz',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static array operators
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static in()', () => {
    it('should create an IN condition with an array value', () => {
      const result = Where.in<TestEntity>('status', ['active', 'pending']);
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.IN,
        value: ['active', 'pending'],
      });
    });
  });

  describe('static notIn()', () => {
    it('should create a NIN condition with an array value', () => {
      const result = Where.notIn<TestEntity>('status', ['banned', 'suspended']);
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.NIN,
        value: ['banned', 'suspended'],
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static nullary operators
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static isNull()', () => {
    it('should create an IS_NULL condition with no value property', () => {
      const result = Where.isNull<TestEntity>('name');
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.IS_NULL,
      });
    });

    it('should not have a value property', () => {
      const result = Where.isNull<TestEntity>('name');
      expect('value' in result).toBe(false);
    });
  });

  describe('static notNull()', () => {
    it('should create a NOT_NULL condition with no value property', () => {
      const result = Where.notNull<TestEntity>('status');
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.NOT_NULL,
      });
    });

    it('should not have a value property', () => {
      const result = Where.notNull<TestEntity>('status');
      expect('value' in result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static pair operator
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static between()', () => {
    it('should create a BETWEEN condition with a two-element tuple', () => {
      const result = Where.between<TestEntity>('id', 10, 20);
      expect(result).toEqual({
        field: 'id',
        operator: WhereOperator.BETWEEN,
        value: [10, 20],
      });
    });

    it('should work with date strings', () => {
      const result = Where.between('created', '2024-01-01', '2024-12-31');
      expect(result).toEqual({
        field: 'created',
        operator: WhereOperator.BETWEEN,
        value: ['2024-01-01', '2024-12-31'],
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static compound builders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static and()', () => {
    it('should create an AND compound from two conditions', () => {
      const c1 = Where.eq<TestEntity>('status', 'active');
      const c2 = Where.gt('age', 18);

      const result = Where.and(c1, c2);
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'age', operator: 'gt', value: 18 },
        ],
      });
    });

    it('should accept more than two conditions', () => {
      const result = Where.and(
        Where.eq('a', 1),
        Where.eq('b', 2),
        Where.eq('c', 3),
      );
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'a', operator: 'eq', value: 1 },
          { field: 'b', operator: 'eq', value: 2 },
          { field: 'c', operator: 'eq', value: 3 },
        ],
      });
    });

    it('should accept nested compounds', () => {
      const inner = Where.or(Where.eq('x', 1), Where.eq('y', 2));
      const result = Where.and(Where.eq('z', 3), inner);
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'z', operator: 'eq', value: 3 },
          {
            operator: WhereCompoundOperator.OR,
            conditions: [
              { field: 'x', operator: 'eq', value: 1 },
              { field: 'y', operator: 'eq', value: 2 },
            ],
          },
        ],
      });
    });
  });

  describe('static or()', () => {
    it('should create an OR compound from two conditions', () => {
      const c1 = Where.eq<TestEntity>('status', 'active');
      const c2 = Where.eq<TestEntity>('status', 'pending');

      const result = Where.or(c1, c2);
      expect(result).toEqual({
        operator: WhereCompoundOperator.OR,
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'status', operator: 'eq', value: 'pending' },
        ],
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static where() and for()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static where()', () => {
    it('should wrap a condition in a { where } object', () => {
      const condition = Where.eq<TestEntity>('name', 'Alice');
      expect(Where.where(condition)).toEqual({
        where: { field: 'name', operator: 'eq', value: 'Alice' },
      });
    });
  });

  describe('static for()', () => {
    it('should return a Where instance', () => {
      const w = Where.for<TestEntity>();
      expect(w).toBeInstanceOf(Where);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static rel() and relDot()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static rel()', () => {
    it('should tag a condition with a relation name', () => {
      const condition = Where.eq<TestEntity>('status', 'active');
      const result = Where.rel('tasks', condition);
      expect(result).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
        relation: 'tasks',
      });
    });

    it('should not mutate the original condition', () => {
      const condition = Where.eq<TestEntity>('status', 'active');
      Where.rel('tasks', condition);
      expect('relation' in condition).toBe(false);
    });
  });

  describe('static relDot()', () => {
    it('should extract relation from dot-notation field', () => {
      const condition = Where.eq('status', 'active');
      const result = Where.relDot('blog.status', condition);
      expect(result).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
        relation: 'blog',
      });
    });

    it('should return condition unchanged when no dot is present', () => {
      const condition = Where.eq('status', 'active');
      const result = Where.relDot('status', condition);
      expect(result).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
      });
    });

    it('should throw when leading dot produces empty relation', () => {
      const condition = Where.eq('field', 'value');
      expect(() => Where.relDot('.field', condition)).toThrow(
        'relDot expects "relation.field" dot notation',
      );
    });

    it('should throw for multi-dot fields', () => {
      const condition = Where.eq('c', 'value');
      expect(() => Where.relDot('a.b.c', condition)).toThrow(
        'relDot expects "relation.field" dot notation',
      );
    });

    it('should not mutate the original condition', () => {
      const condition = Where.eq('status', 'active');
      Where.relDot('blog.status', condition);
      expect('relation' in condition).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Instance API
  // ═══════════════════════════════════════════════════════════════════════════

  describe('instance API', () => {
    const w = Where.for<TestEntity>();

    it('eq() should delegate to Where.eq', () => {
      expect(w.eq('name', 'Alice')).toEqual({
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'Alice',
      });
    });

    it('ne() should delegate to Where.ne', () => {
      expect(w.ne('status', 'inactive')).toEqual({
        field: 'status',
        operator: WhereOperator.NE,
        value: 'inactive',
      });
    });

    it('and() should delegate to Where.and', () => {
      const result = w.and(w.eq('status', 'active'), w.eq('name', 'Alice'));
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'name', operator: 'eq', value: 'Alice' },
        ],
      });
    });

    it('or() should delegate to Where.or', () => {
      const result = w.or(w.eq('status', 'active'), w.eq('status', 'pending'));
      expect(result).toEqual({
        operator: WhereCompoundOperator.OR,
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'status', operator: 'eq', value: 'pending' },
        ],
      });
    });

    it('rel() should delegate to Where.rel', () => {
      const condition = w.eq('status', 'active');
      expect(w.rel('tasks', condition)).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
        relation: 'tasks',
      });
    });

    it('relDot() should delegate to Where.relDot', () => {
      const condition = w.eq('status', 'active');
      expect(w.relDot('blog.status', condition)).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
        relation: 'blog',
      });
    });

    it('where() should delegate to Where.where', () => {
      const condition = w.eq('name', 'Alice');
      expect(w.where(condition)).toEqual({
        where: { field: 'name', operator: 'eq', value: 'Alice' },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Type guards
  // ═══════════════════════════════════════════════════════════════════════════

  describe('type guards', () => {
    describe('isWhereCondition()', () => {
      it('should return true for a scalar condition', () => {
        expect(isWhereCondition(Where.eq<TestEntity>('name', 'Alice'))).toBe(
          true,
        );
      });

      it('should return true for a nullary condition', () => {
        expect(isWhereCondition(Where.isNull<TestEntity>('name'))).toBe(true);
      });

      it('should return true for an array condition', () => {
        expect(
          isWhereCondition(Where.in<TestEntity>('status', ['active'])),
        ).toBe(true);
      });

      it('should return true for a pair condition', () => {
        expect(isWhereCondition(Where.between<TestEntity>('id', 1, 10))).toBe(
          true,
        );
      });

      it('should return false for a compound clause', () => {
        const compound = Where.and(
          Where.eq<TestEntity>('name', 'Alice'),
          Where.eq<TestEntity>('status', 'active'),
        );
        expect(isWhereCondition(compound)).toBe(false);
      });
    });

    describe('isWhereCompound()', () => {
      it('should return true for an AND compound', () => {
        const compound = Where.and(
          Where.eq<TestEntity>('name', 'Alice'),
          Where.eq<TestEntity>('status', 'active'),
        );
        expect(isWhereCompound(compound)).toBe(true);
      });

      it('should return true for an OR compound', () => {
        const compound = Where.or(
          Where.eq<TestEntity>('name', 'Alice'),
          Where.eq<TestEntity>('status', 'active'),
        );
        expect(isWhereCompound(compound)).toBe(true);
      });

      it('should return false for a field condition', () => {
        expect(isWhereCompound(Where.eq<TestEntity>('name', 'Alice'))).toBe(
          false,
        );
      });
    });

    describe('isNullaryCondition()', () => {
      it('should return true for IS_NULL', () => {
        expect(isNullaryCondition(Where.isNull<TestEntity>('name'))).toBe(true);
      });

      it('should return true for NOT_NULL', () => {
        expect(isNullaryCondition(Where.notNull<TestEntity>('status'))).toBe(
          true,
        );
      });

      it('should return false for EQ', () => {
        expect(isNullaryCondition(Where.eq<TestEntity>('name', 'Alice'))).toBe(
          false,
        );
      });

      it('should return false for IN', () => {
        expect(
          isNullaryCondition(Where.in<TestEntity>('status', ['active'])),
        ).toBe(false);
      });

      it('should return false for BETWEEN', () => {
        expect(isNullaryCondition(Where.between<TestEntity>('id', 1, 10))).toBe(
          false,
        );
      });
    });

    describe('isArrayCondition()', () => {
      it('should return true for IN', () => {
        expect(
          isArrayCondition(Where.in<TestEntity>('status', ['active'])),
        ).toBe(true);
      });

      it('should return true for NIN', () => {
        expect(
          isArrayCondition(Where.notIn<TestEntity>('status', ['banned'])),
        ).toBe(true);
      });

      it('should return false for EQ', () => {
        expect(isArrayCondition(Where.eq<TestEntity>('name', 'Alice'))).toBe(
          false,
        );
      });

      it('should return false for IS_NULL', () => {
        expect(isArrayCondition(Where.isNull<TestEntity>('name'))).toBe(false);
      });
    });

    describe('isPairCondition()', () => {
      it('should return true for BETWEEN', () => {
        expect(isPairCondition(Where.between<TestEntity>('id', 1, 10))).toBe(
          true,
        );
      });

      it('should return false for EQ', () => {
        expect(isPairCondition(Where.eq<TestEntity>('name', 'Alice'))).toBe(
          false,
        );
      });

      it('should return false for IN', () => {
        expect(
          isPairCondition(Where.in<TestEntity>('status', ['active'])),
        ).toBe(false);
      });

      it('should return false for IS_NULL', () => {
        expect(isPairCondition(Where.isNull<TestEntity>('name'))).toBe(false);
      });
    });
  });
});
