import { Decimal } from 'decimal.js';

import { MoneyColumnTypeException } from '../exceptions/money-column-type.exception.js';
import { moneyAmountTransformer } from '../money-amount.transformer.js';

describe('moneyAmountTransformer', () => {
  describe('from (database → model)', () => {
    /**
     * `node-postgres` returns `numeric` as a string, deliberately, because the
     * value does not survive a JS `number`. This is the normal path on
     * Postgres.
     */
    it('passes a string through unchanged', () => {
      expect(moneyAmountTransformer.from('123.4500')).toBe('123.4500');
      expect(moneyAmountTransformer.from('-0.01')).toBe('-0.01');
      expect(moneyAmountTransformer.from('87962962171296296.21625')).toBe(
        '87962962171296296.21625',
      );
    });

    /**
     * The guard that matters. SQLite has no decimal type: a column declared
     * `decimal`/`numeric` gets NUMERIC affinity and better-sqlite3 hands back
     * a number, already rounded, before any application code runs. Coercing it
     * would bake in the loss; the column declaration is what has to change.
     */
    it('refuses a number, because the precision is already gone', () => {
      expect(() => moneyAmountTransformer.from(123.45)).toThrow(
        MoneyColumnTypeException,
      );
      expect(() => moneyAmountTransformer.from(0)).toThrow(
        MoneyColumnTypeException,
      );
    });

    it('reports an internal fault with a 500 for a wrong column type', () => {
      try {
        moneyAmountTransformer.from(123.45);
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MoneyColumnTypeException);
        if (error instanceof MoneyColumnTypeException) {
          expect(error.httpStatus).toBe(500);
          expect(error.fault).toBe('internal');
          expect(error.errorCode).toBe('MONEY_COLUMN_TYPE');
          expect(error.context.receivedType).toBe('number');
        }
      }
    });

    it('names the fix in the message', () => {
      expect(() => moneyAmountTransformer.from(1.5)).toThrow(
        /numeric on Postgres and text on SQLite/,
      );
    });

    it('accepts anything that renders itself exactly', () => {
      expect(moneyAmountTransformer.from(new Decimal('1.5'))).toBe('1.5');
      expect(moneyAmountTransformer.from(BigInt('123'))).toBe('123');
    });

    /**
     * decimal.js renders `toString()` in exponential notation at these
     * magnitudes; the plain form is what `Money.of` accepts.
     */
    it('renders a decimal plainly at the edges of its range', () => {
      expect(moneyAmountTransformer.from(new Decimal('0.00000001'))).toBe(
        '0.00000001',
      );
      expect(moneyAmountTransformer.from(new Decimal('1e21'))).toBe(
        '1000000000000000000000',
      );
    });

    it('refuses an object whose toFixed does not return a string', () => {
      expect(() => moneyAmountTransformer.from({ toFixed: () => 42 })).toThrow(
        MoneyColumnTypeException,
      );
    });

    it('maps null and undefined to null', () => {
      expect(moneyAmountTransformer.from(null)).toBeNull();
      expect(moneyAmountTransformer.from(undefined)).toBeNull();
    });

    it('refuses anything else', () => {
      expect(() => moneyAmountTransformer.from({})).toThrow(
        MoneyColumnTypeException,
      );
      expect(() => moneyAmountTransformer.from(true)).toThrow(
        MoneyColumnTypeException,
      );
    });
  });

  describe('to (model → database)', () => {
    it('passes a string through unchanged', () => {
      expect(moneyAmountTransformer.to('123.45')).toBe('123.45');
    });

    it('maps null to null', () => {
      expect(moneyAmountTransformer.to(null)).toBeNull();
    });
  });

  it('satisfies the structural shape an ORM transformer needs', () => {
    // TypeORM's ValueTransformer is structural, which is what lets this ship
    // from a package with no ORM dependency.
    expect(typeof moneyAmountTransformer.to).toBe('function');
    expect(typeof moneyAmountTransformer.from).toBe('function');
  });
});
