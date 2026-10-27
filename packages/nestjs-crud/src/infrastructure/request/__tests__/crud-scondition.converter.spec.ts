import { BadRequestException } from '@nestjs/common';

import {
  WhereCompoundOperator,
  WhereOperator,
} from '@concepta/nestjs-repository';

import { type SCondition } from '../crud-query.types.js';
import { SConditionConverter } from '../crud-scondition.converter.js';

interface TestEntity {
  id: string;
  name: string;
  age: number;
  status: string;
}

describe('SConditionConverter', () => {
  describe('empty / falsy inputs', () => {
    it('should return undefined for empty object', () => {
      const result = SConditionConverter.convert<TestEntity>({});
      expect(result).toEqual(undefined);
    });

    it('should return undefined for undefined search', () => {
      const result = SConditionConverter.convert<TestEntity>(
        undefined as unknown as SCondition<TestEntity>,
      );
      expect(result).toEqual(undefined);
    });

    it('should return undefined for null search', () => {
      const result = SConditionConverter.convert<TestEntity>(
        null as unknown as SCondition<TestEntity>,
      );
      expect(result).toEqual(undefined);
    });
  });

  describe('simple field equality', () => {
    it('should convert single string field to eq condition', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: 'John',
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'John',
      });
    });

    it('should convert numeric field to eq condition', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: 25,
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.EQ,
        value: 25,
      });
    });
  });

  describe('null and undefined fields', () => {
    it('should convert null field to isNull condition', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: null,
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.IS_NULL,
      });
    });

    it('should convert undefined field to isNull condition', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: undefined,
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.IS_NULL,
      });
    });
  });

  describe('multiple fields', () => {
    it('should wrap multiple fields in and compound', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: 'John',
        status: 'active',
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'name', operator: WhereOperator.EQ, value: 'John' },
          { field: 'status', operator: WhereOperator.EQ, value: 'active' },
        ],
      });
    });

    it('should handle mix of eq and isNull fields', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: 'John',
        status: null,
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'name', operator: WhereOperator.EQ, value: 'John' },
          { field: 'status', operator: WhereOperator.IS_NULL },
        ],
      });
    });
  });

  describe('operator objects', () => {
    it('should convert $eq operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $eq: 18 },
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.EQ,
        value: 18,
      });
    });

    it('should convert $ne operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        status: { $ne: 'inactive' },
      });
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.NE,
        value: 'inactive',
      });
    });

    it('should convert $gt operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $gt: 18 },
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.GT,
        value: 18,
      });
    });

    it('should convert $gte operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $gte: 18 },
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.GTE,
        value: 18,
      });
    });

    it('should convert $lt operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $lt: 65 },
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.LT,
        value: 65,
      });
    });

    it('should convert $lte operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $lte: 65 },
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.LTE,
        value: 65,
      });
    });

    it('should convert $starts operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $starts: 'Jo' },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.STARTS,
        value: 'Jo',
      });
    });

    it('should convert $nstarts operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $nstarts: 'Jo' },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.NSTARTS,
        value: 'Jo',
      });
    });

    it('should convert $ends operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $ends: 'hn' },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.ENDS,
        value: 'hn',
      });
    });

    it('should convert $nends operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $nends: 'hn' },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.NENDS,
        value: 'hn',
      });
    });

    it('should convert $contains operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $contains: 'oh' },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.CONTAINS,
        value: 'oh',
      });
    });

    it('should convert $ncontains operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $ncontains: 'oh' },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.NCONTAINS,
        value: 'oh',
      });
    });

    it('should convert $in operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        status: { $in: ['active', 'pending'] as unknown as string },
      });
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.IN,
        value: ['active', 'pending'],
      });
    });

    it('should convert $nin operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        status: { $nin: ['deleted', 'banned'] as unknown as string },
      });
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.NIN,
        value: ['deleted', 'banned'],
      });
    });

    it('should convert $null operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $null: true },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.IS_NULL,
      });
    });

    it('should convert $nnull operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: { $nnull: true },
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.NOT_NULL,
      });
    });

    it('should convert $between operator', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $between: [18, 65] as unknown as number },
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.BETWEEN,
        value: [18, 65],
      });
    });
  });

  describe('multiple operators on same field', () => {
    it('should wrap two operators in and compound', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $gt: 18, $lt: 65 },
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'age', operator: WhereOperator.GT, value: 18 },
          { field: 'age', operator: WhereOperator.LT, value: 65 },
        ],
      });
    });
  });

  describe('top-level $or', () => {
    it('should convert $or with two conditions to or compound', () => {
      const result = SConditionConverter.convert<TestEntity>({
        $or: [{ name: 'Alice' }, { name: 'Bob' }],
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.OR,
        conditions: [
          { field: 'name', operator: WhereOperator.EQ, value: 'Alice' },
          { field: 'name', operator: WhereOperator.EQ, value: 'Bob' },
        ],
      });
    });

    it('should return undefined for empty $or array', () => {
      const result = SConditionConverter.convert<TestEntity>({
        $or: [],
      });
      expect(result).toEqual(undefined);
    });
  });

  describe('top-level $and', () => {
    it('should convert $and with two single-field conditions', () => {
      const result = SConditionConverter.convert<TestEntity>({
        $and: [{ name: 'Alice' }, { status: 'active' }],
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'name', operator: WhereOperator.EQ, value: 'Alice' },
          { field: 'status', operator: WhereOperator.EQ, value: 'active' },
        ],
      });
    });

    it('should return undefined for empty $and array', () => {
      const result = SConditionConverter.convert<TestEntity>({
        $and: [],
      });
      expect(result).toEqual(undefined);
    });

    it('should unwrap single $and branch', () => {
      const result = SConditionConverter.convert<TestEntity>({
        $and: [{ name: 'Alice' }],
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'Alice',
      });
    });

    it('should return undefined when all $and branches are empty', () => {
      const result = SConditionConverter.convert<TestEntity>({
        $and: [{}, {}],
      });
      expect(result).toEqual(undefined);
    });
  });

  describe('fields combined with $or', () => {
    it('should combine field conditions with $or using and', () => {
      const result = SConditionConverter.convert<TestEntity>({
        status: 'active',
        $or: [{ name: 'Alice' }, { name: 'Bob' }],
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'status', operator: WhereOperator.EQ, value: 'active' },
          {
            operator: WhereCompoundOperator.OR,
            conditions: [
              { field: 'name', operator: WhereOperator.EQ, value: 'Alice' },
              { field: 'name', operator: WhereOperator.EQ, value: 'Bob' },
            ],
          },
        ],
      });
    });

    it('should return field clauses when $or conditions are all empty', () => {
      const result = SConditionConverter.convert<TestEntity>({
        status: 'active',
        $or: [{}, {}],
      });
      expect(result).toEqual({
        field: 'status',
        operator: WhereOperator.EQ,
        value: 'active',
      });
    });
  });

  describe('nested $or within field operators', () => {
    it('should handle $or with single operator inside field', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $or: { $eq: 18 } },
      });
      expect(result).toEqual({
        field: 'age',
        operator: WhereOperator.EQ,
        value: 18,
      });
    });

    it('should handle $or with multiple operators inside field', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $or: { $null: true, $eq: 0 } },
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.OR,
        conditions: [
          { field: 'age', operator: WhereOperator.EQ, value: 0 },
          { field: 'age', operator: WhereOperator.IS_NULL },
        ],
      });
    });

    it('should combine top-level operators with nested $or', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $gt: 0, $or: { $null: true, $eq: 0 } },
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'age', operator: WhereOperator.GT, value: 0 },
          {
            operator: WhereCompoundOperator.OR,
            conditions: [
              { field: 'age', operator: WhereOperator.EQ, value: 0 },
              { field: 'age', operator: WhereOperator.IS_NULL },
            ],
          },
        ],
      });
    });
  });

  describe('validation errors', () => {
    it('should throw BadRequestException for $in with non-array value', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          status: { $in: 'not-array' },
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for $nin with non-array value', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          status: { $nin: 'not-array' },
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw with message containing "requires array" for $in', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          status: { $in: 'not-array' },
        }),
      ).toThrow(/requires array/);
    });

    it('should throw BadRequestException for $between with single element', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          age: { $between: [1] as unknown as number },
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for $between with non-array', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          age: { $between: 42 as unknown as number },
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw with BETWEEN message for invalid $between', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          age: { $between: [1] as unknown as number },
        }),
      ).toThrow(/BETWEEN operator requires an array with two elements/);
    });

    it('should throw BadRequestException for empty operator object', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          age: {} as unknown as number,
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw with "Empty filter operator object" message', () => {
      expect(() =>
        SConditionConverter.convert<TestEntity>({
          age: {} as unknown as number,
        }),
      ).toThrow(/Empty filter operator object/);
    });
  });

  describe('array field values are ignored', () => {
    it('should skip array field values', () => {
      const result = SConditionConverter.convert<TestEntity>({
        name: 'John',
        status: ['active', 'pending'] as unknown as string,
      });
      expect(result).toEqual({
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'John',
      });
    });

    it('should return undefined when only array field values present', () => {
      const result = SConditionConverter.convert<TestEntity>({
        status: ['active', 'pending'] as unknown as string,
      });
      expect(result).toEqual(undefined);
    });
  });

  describe('nested and complex scenarios', () => {
    it('should handle nested $or within $and', () => {
      const result = SConditionConverter.convert<TestEntity>({
        $and: [
          { $or: [{ name: 'Alice' }, { name: 'Bob' }] },
          { status: 'active' },
        ],
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          {
            operator: WhereCompoundOperator.OR,
            conditions: [
              { field: 'name', operator: WhereOperator.EQ, value: 'Alice' },
              { field: 'name', operator: WhereOperator.EQ, value: 'Bob' },
            ],
          },
          { field: 'status', operator: WhereOperator.EQ, value: 'active' },
        ],
      });
    });

    it('should handle operator objects mixed with $or at top level', () => {
      const result = SConditionConverter.convert<TestEntity>({
        age: { $gte: 18 },
        $or: [{ status: 'active' }, { status: 'pending' }],
      });
      expect(result).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          { field: 'age', operator: WhereOperator.GTE, value: 18 },
          {
            operator: WhereCompoundOperator.OR,
            conditions: [
              { field: 'status', operator: WhereOperator.EQ, value: 'active' },
              {
                field: 'status',
                operator: WhereOperator.EQ,
                value: 'pending',
              },
            ],
          },
        ],
      });
    });
  });
});
