/* eslint-disable @typescript-eslint/no-explicit-any */
import { WhereOperator } from '@concepta/nestjs-repository';

import {
  isSortOrder,
  validateComparisonOperator,
  validateCondition,
  validateFields,
  validateNumeric,
  validateParamOption,
  validateSort,
  validateUUID,
} from '../crud-query.validator.js';
import { CrudQueryValidatorException } from '../exceptions/crud-query-validator.exception.js';

describe('#request-query', () => {
  describe('#validator', () => {
    describe('#validateFields', () => {
      it('should pass for valid array of strings', () => {
        expect(validateFields(['name', 'age'])).toBeUndefined();
      });

      it('should throw for empty array', () => {
        expect(() => validateFields([])).toThrow(CrudQueryValidatorException);
      });

      it('should throw for non-array', () => {
        expect(() => validateFields('name' as any)).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for array with non-string elements', () => {
        expect(() => validateFields([1, 2] as any)).toThrow(
          CrudQueryValidatorException,
        );
      });
    });

    describe('#validateCondition', () => {
      it('should pass for valid filter condition', () => {
        expect(
          validateCondition(
            { field: 'name', operator: WhereOperator.EQ, value: 'test' },
            'filter',
          ),
        ).toBeUndefined();
      });

      it('should pass for valid or condition', () => {
        expect(
          validateCondition(
            { field: 'name', operator: WhereOperator.NE, value: 'test' },
            'or',
          ),
        ).toBeUndefined();
      });

      it('should throw for non-object value', () => {
        expect(() => validateCondition('bad' as any, 'filter')).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for missing field', () => {
        expect(() =>
          validateCondition({ operator: '$eq' } as any, 'filter'),
        ).toThrow(CrudQueryValidatorException);
      });

      it('should throw for empty field', () => {
        expect(() =>
          validateCondition({ field: '', operator: '$eq' } as any, 'filter'),
        ).toThrow(CrudQueryValidatorException);
      });

      it('should throw for valid field but invalid operator', () => {
        expect(() =>
          validateCondition(
            { field: 'name', operator: 'bad' } as any,
            'filter',
          ),
        ).toThrow(CrudQueryValidatorException);
      });
    });

    describe('#validateComparisonOperator', () => {
      it('should pass for $eq', () => {
        expect(validateComparisonOperator('$eq')).toBeUndefined();
      });

      it('should pass for $ne', () => {
        expect(validateComparisonOperator('$ne')).toBeUndefined();
      });

      it('should pass for $in', () => {
        expect(validateComparisonOperator('$in')).toBeUndefined();
      });

      it('should throw for invalid operator', () => {
        expect(() => validateComparisonOperator('$invalid')).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for empty string', () => {
        expect(() => validateComparisonOperator('')).toThrow(
          CrudQueryValidatorException,
        );
      });
    });

    describe('#isSortOrder', () => {
      it('should return true for ASC', () => {
        expect(isSortOrder('ASC')).toEqual(true);
      });

      it('should return true for DESC', () => {
        expect(isSortOrder('DESC')).toEqual(true);
      });

      it('should return false for invalid string', () => {
        expect(isSortOrder('INVALID')).toEqual(false);
      });

      it('should return false for non-string', () => {
        expect(isSortOrder(123)).toEqual(false);
      });
    });

    describe('#validateSort', () => {
      it('should pass for valid sort', () => {
        expect(validateSort({ field: 'name', order: 'ASC' })).toBeUndefined();
      });

      it('should pass for DESC order', () => {
        expect(validateSort({ field: 'name', order: 'DESC' })).toBeUndefined();
      });

      it('should throw for non-object', () => {
        expect(() => validateSort('bad' as any)).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for missing field', () => {
        expect(() => validateSort({ order: 'ASC' } as any)).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for empty field', () => {
        expect(() => validateSort({ field: '', order: 'ASC' })).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for valid field but invalid order', () => {
        expect(() => validateSort({ field: 'name', order: 'INVALID' })).toThrow(
          CrudQueryValidatorException,
        );
      });
    });

    describe('#validateNumeric', () => {
      it('should pass for valid number', () => {
        expect(validateNumeric(10, 'limit')).toBeUndefined();
      });

      it('should pass for zero', () => {
        expect(validateNumeric(0, 'offset')).toBeUndefined();
      });

      it('should throw for string value', () => {
        expect(() => validateNumeric('10' as any, 'limit')).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for null', () => {
        expect(() => validateNumeric(null as any, 'page')).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for undefined', () => {
        expect(() => validateNumeric(undefined as any, 'cache')).toThrow(
          CrudQueryValidatorException,
        );
      });
    });

    describe('#validateParamOption', () => {
      it('should pass for valid option with field and type', () => {
        const options = { id: { field: 'id', type: 'uuid' as const } };
        expect(validateParamOption(options, 'id')).toBeUndefined();
      });

      it('should return early for disabled option', () => {
        const options = {
          id: { field: 'id', type: 'uuid' as const, disabled: true },
        };
        expect(validateParamOption(options, 'id')).toBeUndefined();
      });

      it('should throw for non-object options', () => {
        expect(() => validateParamOption(null as any, 'id')).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for missing option name', () => {
        const options = { id: { field: 'id', type: 'uuid' as const } };
        expect(() => validateParamOption(options, 'missing')).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for option missing field', () => {
        const options = { id: { type: 'uuid' } };
        expect(() => validateParamOption(options as any, 'id')).toThrow(
          CrudQueryValidatorException,
        );
      });

      it('should throw for option missing type', () => {
        const options = { id: { field: 'id' } };
        expect(() => validateParamOption(options as any, 'id')).toThrow(
          CrudQueryValidatorException,
        );
      });
    });

    describe('#validateUUID', () => {
      const uuid = 'cf0917fc-af7d-11e9-a2a3-2a2ae2dbcce4';
      const uuidV4 = '6650aad9-29bd-4601-b9b1-543a7a2d2d54';
      const invalid = 'invalid-uuid';

      it('should throw an error', () => {
        expect(validateUUID.bind(validateUUID, invalid)).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should pass, 1', () => {
        expect(validateUUID(uuid, '')).toBeUndefined();
      });
      it('should pass, 2', () => {
        expect(validateUUID(uuidV4, '')).toBeUndefined();
      });
    });
  });
});
