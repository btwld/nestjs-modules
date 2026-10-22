import { Decimal } from 'decimal.js';

import { RuntimeException } from '../../../exceptions/runtime.exception.js';
import { CurrencyMismatchException } from '../exceptions/currency-mismatch.exception.js';
import { CurrencyUnknownException } from '../exceptions/currency-unknown.exception.js';
import { MoneyInvalidAmountException } from '../exceptions/money-invalid-amount.exception.js';
import { Money } from '../money.js';
import { Rounding } from '../rounding.js';

describe('Money', () => {
  /**
   * The reason this class exists. Each value below is one where the two
   * idioms a TypeScript developer reaches for disagree with each other, so
   * neither can be trusted to implement a stated half-up rule.
   */
  describe('rounding the values native JavaScript gets wrong', () => {
    const cases = [
      { input: '2.675', halfUp: '2.68' },
      { input: '10.235', halfUp: '10.24' },
      { input: '1.105', halfUp: '1.11' },
      { input: '1.005', halfUp: '1.01' },
      { input: '8.165', halfUp: '8.17' },
      { input: '1.015', halfUp: '1.02' },
    ];

    it.each(cases)(
      'rounds $input half-up to two decimals as $halfUp',
      ({ input, halfUp }) => {
        expect(Money.of(input, 'USD').round(Rounding.halfUp(2)).toFixed()).toBe(
          halfUp,
        );
      },
    );
  });

  /**
   * Guards the private `Decimal.clone({ precision: 60 })`. decimal.js rounds
   * the result of EVERY arithmetic operation to `Decimal.precision`
   * significant digits, which defaults to 20 — so with the global
   * constructor this product silently loses its last two digits. The short
   * values above would never reveal it.
   */
  describe('precision', () => {
    const wideAmount = '1234567890123456789'; // 19 significant digits
    const longRate = '0.071250';
    const exactProduct = '87962962171296296.21625';

    it('keeps a 19-digit amount times a 6-digit rate exact', () => {
      expect(Money.of(wideAmount, 'USD').multiply(longRate).toFixed()).toBe(
        exactProduct,
      );
    });

    it('would lose digits at decimal.js default precision', () => {
      // Demonstrates the failure the clone prevents, so the clone cannot be
      // removed without this test turning red.
      const atDefaultPrecision = new Decimal(wideAmount)
        .times(longRate)
        .toFixed();

      expect(Decimal.precision).toBe(20);
      expect(atDefaultPrecision).not.toBe(exactProduct);
    });

    it('does not configure the global Decimal constructor', () => {
      // Money must not reach into process-global state that a consumer's own
      // decimal.js shares.
      expect(Decimal.precision).toBe(20);
    });

    it('chains many operations without drift', () => {
      let running = Money.zero('USD');

      for (let i = 0; i < 1000; i++) {
        running = running.add(Money.of('0.01', 'USD'));
      }

      expect(running.toFixed(2)).toBe('10.00');
    });
  });

  describe('tie direction', () => {
    it('rounds a negative tie away from zero under halfUp', () => {
      expect(
        Money.of('-2.675', 'USD').round(Rounding.halfUp(2)).toFixed(),
      ).toBe('-2.68');
    });

    it('rounds a negative tie towards zero under halfDown', () => {
      expect(
        Money.of('-2.675', 'USD').round(Rounding.halfDown(2)).toFixed(),
      ).toBe('-2.67');
    });

    it('rounds to the even neighbour under halfEven', () => {
      expect(
        Money.of('2.675', 'USD').round(Rounding.halfEven(2)).toFixed(),
      ).toBe('2.68');
      expect(
        Money.of('2.665', 'USD').round(Rounding.halfEven(2)).toFixed(),
      ).toBe('2.66');
    });
  });

  describe('of', () => {
    it('accepts a decimal string', () => {
      expect(Money.of('1234.56', 'USD').toFixed()).toBe('1234.56');
    });

    it('accepts a bigint', () => {
      // `BigInt(…)` rather than a `1234n` literal: this repository targets
      // ES2017, where bigint literals are not available.
      expect(Money.of(BigInt('1234'), 'USD').toFixed()).toBe('1234');
    });

    it('accepts a Decimal', () => {
      expect(Money.of(new Decimal('1.5'), 'USD').toFixed()).toBe('1.5');
    });

    describe('digit limit', () => {
      const digits38 = '1234567890123456789.0123456789012345678';
      const digits39 = '1234567890123456789.01234567890123456789';

      it('accepts 38 significant digits', () => {
        expect(Money.of(digits38, 'USD').toFixed()).toBe(digits38);
      });

      it('refuses 39 significant digits', () => {
        expect(() => Money.of(digits39, 'USD')).toThrow(
          MoneyInvalidAmountException,
        );
      });

      it('counts trailing integer zeros but not leading decimal zeros', () => {
        expect(() => Money.of(`1${'0'.repeat(38)}`, 'USD')).toThrow(
          MoneyInvalidAmountException,
        );
        expect(Money.of(`0.${'0'.repeat(50)}1`, 'USD').isPositive()).toBe(true);
      });

      it('applies to a multiplication factor as well', () => {
        expect(() => Money.of('1', 'USD').multiply(digits39)).toThrow(
          MoneyInvalidAmountException,
        );
      });
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'refuses a non-finite Decimal (%s) wherever one is accepted',
      (value) => {
        const decimal = new Decimal(value);
        const one = Money.of('1', 'USD');

        expect(() => Money.of(decimal, 'USD')).toThrow(
          MoneyInvalidAmountException,
        );
        expect(() => one.multiply(decimal)).toThrow(
          MoneyInvalidAmountException,
        );
        expect(() => one.divide(decimal, Rounding.halfUp(2))).toThrow(
          MoneyInvalidAmountException,
        );
      },
    );

    it('refuses a number', () => {
      // @ts-expect-error a number is deliberately not assignable
      expect(() => Money.of(1234.56, 'USD')).toThrow(
        MoneyInvalidAmountException,
      );
    });

    /**
     * A nullable amount column reads back as `null`, and an unvalidated
     * JavaScript caller can pass anything; both must get a money error, not a
     * `TypeError` from deep inside the parser.
     */
    it.each([null, undefined, {}])('refuses %s', (value) => {
      // @ts-expect-error not assignable, but reachable at runtime
      expect(() => Money.of(value, 'USD')).toThrow(MoneyInvalidAmountException);
    });

    it('refuses an unparseable string', () => {
      expect(() => Money.of('1,234.56', 'USD')).toThrow(
        MoneyInvalidAmountException,
      );
      expect(() => Money.of('', 'USD')).toThrow(MoneyInvalidAmountException);
      expect(() => Money.of('1e5', 'USD')).toThrow(MoneyInvalidAmountException);
    });

    it('refuses an unrecognised currency', () => {
      expect(() => Money.of('1.00', 'ZZZ')).toThrow(CurrencyUnknownException);
    });

    it('reports a client fault with a 400 for an unknown currency', () => {
      try {
        Money.of('1.00', 'ZZZ');
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CurrencyUnknownException);
        if (error instanceof CurrencyUnknownException) {
          expect(error.httpStatus).toBe(400);
          expect(error.fault).toBe('client');
          expect(error.errorCode).toBe('CURRENCY_UNKNOWN');
          expect(error.context.code).toBe('ZZZ');
        }
      }
    });
  });

  describe('fromNumber', () => {
    it('accepts a number deliberately', () => {
      expect(Money.fromNumber(1234.56, 'USD').toFixed()).toBe('1234.56');
    });

    it('reads the shortest round-trip representation, not the float', () => {
      // 0.1 is not exactly representable in binary, but decimal.js reads the
      // literal's shortest round-trip form, so this is exact.
      expect(Money.fromNumber(0.1, 'USD').toFixed()).toBe('0.1');
    });

    it('faithfully carries in damage done before the call', () => {
      // The hazard the named factory exists to make visible.
      expect(Money.fromNumber(0.1 + 0.2, 'USD').toFixed()).toBe(
        '0.30000000000000004',
      );
    });

    it('refuses a non-finite number', () => {
      expect(() => Money.fromNumber(Number.NaN, 'USD')).toThrow(
        MoneyInvalidAmountException,
      );
      expect(() => Money.fromNumber(Number.POSITIVE_INFINITY, 'USD')).toThrow(
        MoneyInvalidAmountException,
      );
    });
  });

  describe('arithmetic', () => {
    it('adds and subtracts exactly', () => {
      const a = Money.of('0.1', 'USD');
      const b = Money.of('0.2', 'USD');

      expect(a.add(b).toFixed()).toBe('0.3');
      expect(b.subtract(a).toFixed()).toBe('0.1');
    });

    it('does not round during arithmetic', () => {
      // Three operations, no rounding instruction, full precision retained.
      const result = Money.of('100', 'USD')
        .multiply('0.071250')
        .multiply('0.071250')
        .add(Money.of('0.000000001', 'USD'));

      expect(result.toFixed()).toBe('0.507656251');
    });

    it('negates and takes magnitude', () => {
      expect(Money.of('1.50', 'USD').negate().toFixed()).toBe('-1.5');
      expect(Money.of('-1.50', 'USD').abs().toFixed()).toBe('1.5');
    });

    it('refuses to add a different currency', () => {
      expect(() =>
        Money.of('1.00', 'USD').add(Money.of('1.00', 'EUR')),
      ).toThrow(CurrencyMismatchException);
    });

    it('reports a usage fault for a currency mismatch', () => {
      try {
        Money.of('1.00', 'USD').add(Money.of('1.00', 'EUR'));
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CurrencyMismatchException);
        if (error instanceof CurrencyMismatchException) {
          expect(error.httpStatus).toBe(400);
          expect(error.fault).toBe('usage');
          expect(error.errorCode).toBe('CURRENCY_MISMATCH');
          expect(error.context).toMatchObject({
            operation: 'add',
            left: 'USD',
            right: 'EUR',
          });
        }
      }
    });
  });

  describe('multiply', () => {
    it('accepts an integer number as a quantity', () => {
      expect(Money.of('1.25', 'USD').multiply(4).toFixed(2)).toBe('5.00');
    });

    it('refuses a fractional number', () => {
      expect(() => Money.of('100', 'USD').multiply(0.27)).toThrow(
        MoneyInvalidAmountException,
      );
    });

    it('names the string form in the refusal message', () => {
      expect(() => Money.of('100', 'USD').multiply(0.27)).toThrow(
        /pass '0.27' as a string/,
      );
    });

    it('accepts a fractional rate as a string', () => {
      expect(Money.of('100', 'USD').multiply('0.27').toFixed(2)).toBe('27.00');
    });
  });

  describe('divide', () => {
    it('requires an explicit rounding', () => {
      expect(
        Money.of('100', 'USD').divide(3, Rounding.halfUp(2)).toFixed(),
      ).toBe('33.33');
    });

    it('honours the rounding mode given', () => {
      expect(Money.of('100', 'USD').divide(3, Rounding.up(2)).toFixed()).toBe(
        '33.34',
      );
      expect(Money.of('100', 'USD').divide(3, Rounding.down(2)).toFixed()).toBe(
        '33.33',
      );
    });

    it('refuses division by zero', () => {
      expect(() =>
        Money.of('100', 'USD').divide(0, Rounding.halfUp(2)),
      ).toThrow(MoneyInvalidAmountException);
    });

    it('refuses a missing rounding from an untyped caller', () => {
      // @ts-expect-error the rounding is required, but JavaScript can omit it
      expect(() => Money.of('100', 'USD').divide(3)).toThrow(
        MoneyInvalidAmountException,
      );
    });
  });

  describe('allocate', () => {
    it('splits without losing a cent', () => {
      const parts = Money.of('100.00', 'USD').allocate([1, 1, 1]);

      expect(parts.map((p) => p.toFixed(2))).toEqual([
        '33.34',
        '33.33',
        '33.33',
      ]);
    });

    it('splits by weight', () => {
      const parts = Money.of('100.00', 'USD').allocate([70, 30]);

      expect(parts.map((p) => p.toFixed(2))).toEqual(['70.00', '30.00']);
    });

    /**
     * Shares of 0.0166… and 0.0333… floor to 0.01 and 0.03, leaving
     * fractional parts that differ, so the order decides the result:
     * largest first gives `[0.02, 0.03]`, smallest first would give
     * `[0.01, 0.04]`.
     */
    it('gives the remainder to the largest fractional part first', () => {
      const parts = Money.of('0.05', 'USD').allocate([1, 2]);

      expect(parts.map((p) => p.toFixed(2))).toEqual(['0.02', '0.03']);
    });

    it('splits a negative amount as the mirror of its positive', () => {
      const parts = Money.of('-100.00', 'USD').allocate([1, 1, 1]);

      expect(parts.map((p) => p.toFixed(2))).toEqual([
        '-33.34',
        '-33.33',
        '-33.33',
      ]);
    });

    /**
     * Flooring a negative amount goes away from zero, which would hand out a
     * cent the amount never had.
     */
    it('drops a negative sub-unit rather than growing the total', () => {
      const parts = Money.of('-10.005', 'USD').allocate([1, 1]);

      expect(parts.map((p) => p.toFixed(2))).toEqual(['-5.00', '-5.00']);
    });

    it('treats a -0 weight as zero', () => {
      const parts = Money.of('10.00', 'USD').allocate([1, -0, '-0']);

      expect(parts.map((p) => p.toFixed(2))).toEqual(['10.00', '0.00', '0.00']);
    });

    it('handles a zero weight', () => {
      const parts = Money.of('10.00', 'USD').allocate([1, 0, 1]);

      expect(parts.map((p) => p.toFixed(2))).toEqual(['5.00', '0.00', '5.00']);
    });

    it('allocates at the currency scale, so JPY splits to whole yen', () => {
      const parts = Money.of('100', 'JPY').allocate([1, 1, 1]);

      expect(parts.map((p) => p.toFixed())).toEqual(['34', '33', '33']);
    });

    it('sums exactly to the original for many shapes', () => {
      const amounts = [
        '0.01',
        '0.05',
        '1.00',
        '99.99',
        '100.00',
        '12345.67',
        '0.03',
      ];
      const weightSets = [
        [1, 1],
        [1, 1, 1],
        [1, 2, 3],
        [7, 11, 13, 17],
        [1, 0, 0, 1],
        [999, 1],
        [1, 1, 1, 1, 1, 1, 1],
      ];

      for (const amount of amounts) {
        for (const weights of weightSets) {
          const total = Money.of(amount, 'USD');
          const parts = total.allocate(weights);
          const summed = parts.reduce(
            (sum, part) => sum.add(part),
            Money.zero('USD'),
          );

          expect(summed.toFixed(2)).toBe(total.toFixed(2));
          expect(parts).toHaveLength(weights.length);
        }
      }
    });

    it('is deterministic for the same inputs', () => {
      const first = Money.of('0.07', 'USD').allocate([1, 1, 1]);
      const second = Money.of('0.07', 'USD').allocate([1, 1, 1]);

      expect(first.map((p) => p.toFixed(2))).toEqual(
        second.map((p) => p.toFixed(2)),
      );
    });

    it('refuses no weights, negative weights and all-zero weights', () => {
      const amount = Money.of('10.00', 'USD');

      expect(() => amount.allocate([])).toThrow(MoneyInvalidAmountException);
      expect(() => amount.allocate([1, -1])).toThrow(
        MoneyInvalidAmountException,
      );
      expect(() => amount.allocate([0, 0])).toThrow(
        MoneyInvalidAmountException,
      );
    });
  });

  describe('comparison', () => {
    it('compares numerically, not textually', () => {
      expect(Money.of('1.50', 'USD').equals(Money.of('1.5', 'USD'))).toBe(true);
      expect(Money.of('10', 'USD').greaterThan(Money.of('9.99', 'USD'))).toBe(
        true,
      );
    });

    /**
     * Equal amounts are the case that separates `>=` from `>` and `<=` from
     * `<`, so each method is asserted on both sides of it and at it.
     */
    it.each([
      {
        left: '1.00',
        right: '2.00',
        gt: false,
        gte: false,
        lt: true,
        lte: true,
      },
      {
        left: '2.00',
        right: '2.0',
        gt: false,
        gte: true,
        lt: false,
        lte: true,
      },
      {
        left: '3.00',
        right: '2.00',
        gt: true,
        gte: true,
        lt: false,
        lte: false,
      },
    ])('orders $left against $right', ({ left, right, gt, gte, lt, lte }) => {
      const a = Money.of(left, 'USD');
      const b = Money.of(right, 'USD');

      expect(a.greaterThan(b)).toBe(gt);
      expect(a.greaterThanOrEqual(b)).toBe(gte);
      expect(a.lessThan(b)).toBe(lt);
      expect(a.lessThanOrEqual(b)).toBe(lte);
    });

    it('treats different currencies as unequal rather than throwing', () => {
      // `equals` is a predicate used in assertions and filters; throwing would
      // make a comparison of two legitimately different things an error.
      expect(Money.of('1.00', 'USD').equals(Money.of('1.00', 'EUR'))).toBe(
        false,
      );
    });

    it('refuses ordering across currencies', () => {
      expect(() =>
        Money.of('1.00', 'USD').lessThan(Money.of('1.00', 'EUR')),
      ).toThrow(CurrencyMismatchException);
    });

    it('classifies sign', () => {
      expect(Money.zero('USD').isZero()).toBe(true);
      expect(Money.of('-0.00', 'USD').isZero()).toBe(true);
      expect(Money.of('-0.01', 'USD').isNegative()).toBe(true);
      expect(Money.of('0.01', 'USD').isPositive()).toBe(true);
      expect(Money.zero('USD').isNegative()).toBe(false);
      expect(Money.of('-0.00', 'USD').isNegative()).toBe(false);
      expect(Money.zero('USD').isPositive()).toBe(false);
    });
  });

  describe('immutability', () => {
    it('never mutates the receiver', () => {
      const original = Money.of('100.00', 'USD');

      original.add(Money.of('1.00', 'USD'));
      original.multiply('2');
      original.round(Rounding.halfUp(0));
      original.negate();

      expect(original.toFixed(2)).toBe('100.00');
    });

    it('is frozen', () => {
      expect(Object.isFrozen(Money.of('1.00', 'USD'))).toBe(true);
    });
  });

  describe('serialization', () => {
    it('pads to a scale', () => {
      expect(Money.of('1.5', 'USD').toFixed(2)).toBe('1.50');
      expect(Money.of('7', 'JPY').toFixed(0)).toBe('7');
    });

    /**
     * Formatting must not be a place where rounding happens unannounced:
     * `2.675` would otherwise print as `2.68`.
     */
    it('refuses to format at a scale that would round', () => {
      expect(() => Money.of('2.675', 'USD').toFixed(2)).toThrow(
        MoneyInvalidAmountException,
      );
    });

    it.each([-1, 2.5, 21, Number.NaN])(
      'refuses a formatting scale of %s',
      (scale) => {
        expect(() => Money.of('1', 'USD').toFixed(scale)).toThrow(
          RuntimeException,
        );
      },
    );

    it('round-trips through JSON', () => {
      const original = Money.of('1234.56', 'USD');
      const restored = Money.fromJSON(
        JSON.parse(JSON.stringify(original.toJSON())),
      );

      expect(restored.equals(original)).toBe(true);
    });

    it('never uses exponential notation', () => {
      expect(Money.of('0.00000001', 'USD').toFixed()).toBe('0.00000001');
      expect(Money.of('100000000000000000000', 'USD').toFixed()).toBe(
        '100000000000000000000',
      );
    });

    it('describes itself with its currency', () => {
      expect(String(Money.of('1234.56', 'USD'))).toBe('1234.56 USD');
    });
  });
});
