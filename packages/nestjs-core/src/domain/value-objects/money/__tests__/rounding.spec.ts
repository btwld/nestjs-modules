import { Decimal } from 'decimal.js';

import { RuntimeException } from '../../../exceptions/runtime.exception.js';
import { Rounding, RoundingMode } from '../rounding.js';

const FACTORIES = [
  {
    factory: 'halfUp',
    create: () => Rounding.halfUp(2),
    mode: RoundingMode.HalfUp,
    expected: Decimal.ROUND_HALF_UP,
  },
  {
    factory: 'halfDown',
    create: () => Rounding.halfDown(2),
    mode: RoundingMode.HalfDown,
    expected: Decimal.ROUND_HALF_DOWN,
  },
  {
    factory: 'halfEven',
    create: () => Rounding.halfEven(2),
    mode: RoundingMode.HalfEven,
    expected: Decimal.ROUND_HALF_EVEN,
  },
  {
    factory: 'up',
    create: () => Rounding.up(2),
    mode: RoundingMode.Up,
    expected: Decimal.ROUND_UP,
  },
  {
    factory: 'down',
    create: () => Rounding.down(2),
    mode: RoundingMode.Down,
    expected: Decimal.ROUND_DOWN,
  },
];

describe('Rounding', () => {
  it.each(FACTORIES)('$factory() carries mode $mode', ({ create, mode }) => {
    expect(create().mode).toBe(mode);
  });

  it('has a factory for every mode', () => {
    expect(FACTORIES.map(({ mode }) => mode).sort()).toEqual(
      Object.values(RoundingMode).sort(),
    );
  });

  it('carries the scale it was given', () => {
    expect(Rounding.halfUp(0).scale).toBe(0);
    expect(Rounding.halfUp(4).scale).toBe(4);
  });

  it('maps every mode to a distinct decimal.js constant', () => {
    const constants = FACTORIES.map(({ create }) => create().decimalRounding);

    expect(new Set(constants).size).toBe(FACTORIES.length);
  });

  /**
   * The mapping is the one place a wrong constant would silently change every
   * rounded amount in the system, so it is asserted against decimal.js's own
   * named constants rather than against numbers.
   */
  it.each(FACTORIES)(
    '$mode maps to the matching decimal.js constant',
    ({ create, expected }) => {
      expect(create().decimalRounding).toBe(expected);
    },
  );

  it('is frozen', () => {
    expect(Object.isFrozen(Rounding.halfUp(2))).toBe(true);
  });

  describe('of', () => {
    it.each(FACTORIES)(
      'builds the same rounding as $factory() from its mode',
      ({ create, mode }) => {
        const rounding = Rounding.of(2, mode);

        expect(rounding.mode).toBe(create().mode);
        expect(rounding.scale).toBe(2);
      },
    );

    /**
     * A mode read from configuration is untyped text, so the type alone
     * cannot stop a typo.
     */
    it('accepts a mode given as configuration text', () => {
      const fromConfig: string = 'halfEven';

      expect(Rounding.of(2, fromConfig).mode).toBe(RoundingMode.HalfEven);
    });

    it('refuses text that is not a mode', () => {
      expect(() => Rounding.of(2, 'sideways')).toThrow(RuntimeException);
    });

    it('validates the scale', () => {
      expect(() => Rounding.of(21, RoundingMode.HalfUp)).toThrow(
        RuntimeException,
      );
    });
  });

  describe('scale validation', () => {
    it.each([-1, 1.5, 21, Number.NaN, Number.POSITIVE_INFINITY])(
      'refuses a scale of %s',
      (scale) => {
        expect(() => Rounding.halfUp(scale)).toThrow(RuntimeException);
      },
    );

    it('reports a bad scale as a usage fault', () => {
      try {
        Rounding.halfUp(21);
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuntimeException);
        if (error instanceof RuntimeException) {
          expect(error.fault).toBe('usage');
        }
      }
    });

    it('accepts the boundaries', () => {
      expect(() => Rounding.halfUp(0)).not.toThrow();
      expect(() => Rounding.halfUp(20)).not.toThrow();
    });
  });
});
