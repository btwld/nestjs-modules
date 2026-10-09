import { CurrencyConfigurationException } from './exceptions/currency-configuration.exception.js';
import { CurrencyUnknownException } from './exceptions/currency-unknown.exception.js';

/**
 * Minor units per ISO 4217 currency code — `{ USD: 2, JPY: 0, KWD: 3 }`.
 */
export type CurrencyTable = Readonly<Record<string, number>>;

/**
 * How {@link configureCurrencies} combines a table with the built-in one.
 */
export interface ConfigureCurrenciesOptions {
  /**
   * `'extend'` (the default) adds to the built-in currencies and overrides
   * any it repeats; `'replace'` accepts only the table given.
   */
  mode?: 'extend' | 'replace';
}

/**
 * The currencies available without configuration: widely used ISO 4217 codes
 * with their minor units, from the ISO 4217 list published 2026-09-17.
 *
 * Deliberately not exhaustive. A code missing from here is refused, never
 * given a guessed scale — add the currencies an application needs with
 * {@link configureCurrencies}.
 */
const BUILT_IN: CurrencyTable = Object.freeze({
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CHF: 2,
  CNY: 2,
  CAD: 2,
  AUD: 2,
  NZD: 2,
  HKD: 2,
  SGD: 2,
  SEK: 2,
  NOK: 2,
  DKK: 2,
  PLN: 2,
  CZK: 2,
  HUF: 2,
  INR: 2,
  KRW: 0,
  MXN: 2,
  BRL: 2,
  ZAR: 2,
  ILS: 2,
  TRY: 2,
  THB: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  AED: 2,
  SAR: 2,
});

let currencies: ReadonlyMap<string, number> = new Map(Object.entries(BUILT_IN));
let settled = false;

/**
 * Set the currencies this process accepts. Call it once, at startup — in a
 * Nest application, at the top of `main.ts` before `NestFactory.create`.
 *
 * Refuses a second call, and a call made after any currency has been looked
 * up, so an amount's scale cannot change while the process is running.
 *
 * @example
 * ```ts
 * configureCurrencies({ ISK: 0, VND: 0 });
 * ```
 */
export function configureCurrencies(
  table: CurrencyTable,
  options?: ConfigureCurrenciesOptions,
): void {
  if (settled) {
    throw new CurrencyConfigurationException(
      'currencies are already configured or in use — call it once, at ' +
        'startup, before any currency is looked up (Money.of, moneySchema, ' +
        'isKnownCurrency, minorUnitsOf)',
    );
  }

  for (const [code, minorUnits] of Object.entries(table)) {
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new CurrencyConfigurationException(
        `"${code}" is not an ISO 4217 code`,
      );
    }
    if (!Number.isInteger(minorUnits) || minorUnits < 0 || minorUnits > 20) {
      throw new CurrencyConfigurationException(
        `${code} has ${minorUnits} minor units — expected an integer from 0 to 20`,
      );
    }
  }

  const effective =
    options?.mode === 'replace' ? table : { ...BUILT_IN, ...table };

  currencies = new Map(Object.entries(effective));
  settled = true;
}

/**
 * Restore the built-in currencies and allow {@link configureCurrencies} again.
 * For tests only; exported from the `testing` entry point.
 */
export function resetCurrencies(): void {
  currencies = new Map(Object.entries(BUILT_IN));
  settled = false;
}

function lookup(code: string): number | undefined {
  settled = true;
  return currencies.get(code);
}

/**
 * Whether `code` is a currency this process accepts.
 */
export function isKnownCurrency(code: string): boolean {
  return lookup(code) !== undefined;
}

/**
 * The number of decimal places `code`'s minor unit occupies: 2 for `USD`,
 * 0 for `JPY`, 3 for `KWD`.
 *
 * Throws {@link CurrencyUnknownException} rather than defaulting, because
 * guessing a currency's scale is how money goes missing.
 */
export function minorUnitsOf(code: string): number {
  const minorUnits = lookup(code);

  if (minorUnits === undefined) {
    throw new CurrencyUnknownException(code);
  }

  return minorUnits;
}

/**
 * Refuse a currency code this process does not accept.
 */
export function assertKnownCurrency(code: string): void {
  if (!isKnownCurrency(code)) {
    throw new CurrencyUnknownException(code);
  }
}
