import {
  assertKnownCurrency,
  configureCurrencies,
  isKnownCurrency,
  minorUnitsOf,
  resetCurrencies,
} from '../currency.js';
import { CurrencyConfigurationException } from '../exceptions/currency-configuration.exception.js';
import { CurrencyUnknownException } from '../exceptions/currency-unknown.exception.js';

describe('currency', () => {
  beforeEach(() => resetCurrencies());

  describe('minorUnitsOf', () => {
    it.each([
      { code: 'USD', minorUnits: 2 },
      { code: 'EUR', minorUnits: 2 },
      { code: 'GBP', minorUnits: 2 },
      { code: 'JPY', minorUnits: 0 },
      { code: 'KRW', minorUnits: 0 },
      { code: 'KWD', minorUnits: 3 },
      { code: 'BHD', minorUnits: 3 },
      // ISO 4217 says 2; ICU's display precision says 0, which is why the
      // built-in table is ISO data rather than read from `Intl`.
      { code: 'HUF', minorUnits: 2 },
    ])(
      'reports $minorUnits decimal places for $code',
      ({ code, minorUnits }) => {
        expect(minorUnitsOf(code)).toBe(minorUnits);
      },
    );

    it('refuses an unknown code rather than assuming two places', () => {
      expect(() => minorUnitsOf('ZZZ')).toThrow(CurrencyUnknownException);
    });

    it('refuses a real currency that is not configured, naming the fix', () => {
      expect(() => minorUnitsOf('ISK')).toThrow(/configureCurrencies/);
    });
  });

  describe('configureCurrencies', () => {
    it('extends the built-in currencies by default', () => {
      configureCurrencies({ ISK: 0, VND: 0 });

      expect(minorUnitsOf('ISK')).toBe(0);
      expect(minorUnitsOf('VND')).toBe(0);
      expect(minorUnitsOf('USD')).toBe(2);
    });

    it('overrides a built-in currency it repeats', () => {
      configureCurrencies({ JPY: 2 });

      expect(minorUnitsOf('JPY')).toBe(2);
    });

    it('accepts only the given table in replace mode', () => {
      configureCurrencies({ ISK: 0 }, { mode: 'replace' });

      expect(minorUnitsOf('ISK')).toBe(0);
      expect(isKnownCurrency('USD')).toBe(false);
    });

    it('refuses a second call', () => {
      configureCurrencies({ ISK: 0 });

      expect(() => configureCurrencies({ VND: 0 })).toThrow(
        CurrencyConfigurationException,
      );
    });

    /**
     * Configuring after a lookup would let the same code round to one scale
     * before the call and another after it.
     */
    it('refuses a call after a currency has been looked up', () => {
      minorUnitsOf('USD');

      expect(() => configureCurrencies({ ISK: 0 })).toThrow(
        CurrencyConfigurationException,
      );
    });

    it.each(['usd', 'US', 'DOLLAR', ''])('refuses the code "%s"', (code) => {
      expect(() => configureCurrencies({ [code]: 2 })).toThrow(
        CurrencyConfigurationException,
      );
    });

    it.each([-1, 1.5, 21, Number.NaN])(
      'refuses %s minor units',
      (minorUnits) => {
        expect(() => configureCurrencies({ ISK: minorUnits })).toThrow(
          CurrencyConfigurationException,
        );
      },
    );

    it('changes nothing when it refuses a table', () => {
      expect(() => configureCurrencies({ ISK: 0, usd: 2 })).toThrow(
        CurrencyConfigurationException,
      );

      expect(isKnownCurrency('ISK')).toBe(false);
    });

    it('allows configuring again after a reset', () => {
      configureCurrencies({ ISK: 0 });
      resetCurrencies();

      expect(() => configureCurrencies({ VND: 0 })).not.toThrow();
      expect(isKnownCurrency('ISK')).toBe(false);
    });
  });

  describe('isKnownCurrency', () => {
    it('accepts real currency codes', () => {
      expect(isKnownCurrency('USD')).toBe(true);
      expect(isKnownCurrency('JPY')).toBe(true);
    });

    /**
     * A shape-only check would accept these and treat them as real
     * two-decimal currencies.
     */
    it('rejects well-formed codes that are not currencies', () => {
      expect(isKnownCurrency('ZZZ')).toBe(false);
      expect(isKnownCurrency('XAU')).toBe(false); // gold, a metal code
    });

    it('rejects malformed codes', () => {
      expect(isKnownCurrency('US')).toBe(false);
      expect(isKnownCurrency('usd')).toBe(false);
      expect(isKnownCurrency('')).toBe(false);
      expect(isKnownCurrency('DOLLAR')).toBe(false);
    });
  });

  describe('assertKnownCurrency', () => {
    it('passes a known code', () => {
      expect(() => assertKnownCurrency('USD')).not.toThrow();
    });

    it('throws with the offending code in context', () => {
      try {
        assertKnownCurrency('ZZZ');
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CurrencyUnknownException);
        if (error instanceof CurrencyUnknownException) {
          expect(error.context.code).toBe('ZZZ');
        }
      }
    });
  });
});
