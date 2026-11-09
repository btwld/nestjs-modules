import { Decimal } from 'decimal.js';
import { z } from 'zod';

import { conformsTo } from '../../../infrastructure/schemas/conforms-to.util.js';

import { isKnownCurrency } from './currency.js';
import { type MoneyInterface } from './interfaces/money.interface.js';
import { MAX_INPUT_DIGITS } from './money.js';

const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * A decimal amount, as text.
 *
 * `z.number()` is deliberately not accepted. A JSON number cannot carry
 * `0.1` exactly and silently drops digits past 2^53, so accepting one here
 * would let an inexact amount through validation looking perfectly valid —
 * which is the whole failure this value object exists to prevent. A client
 * sending `100.5` instead of `"100.5"` gets a 400, and that is the intended
 * contract.
 *
 * The accepted form is exactly what {@link Money.toJSON} emits — a leading
 * sign only when negative, at least one digit either side of the point. `+1.25`,
 * `1.` and `.5` are refused, so a round trip through this schema cannot change
 * the text of an amount. An amount `Money.of` would refuse for having more
 * than 38 significant digits is refused here too.
 */
export const moneyAmountSchema = z
  .string()
  .regex(AMOUNT_PATTERN, 'Expected a plain decimal string such as "1234.56"')
  .refine(
    (text) =>
      !AMOUNT_PATTERN.test(text) ||
      new Decimal(text).precision(true) <= MAX_INPUT_DIGITS,
    `Expected at most ${MAX_INPUT_DIGITS} significant digits`,
  )
  .describe('Decimal amount as a string, e.g. "1234.56"');

/**
 * A currency code this process accepts — built in, or added with
 * `configureCurrencies`.
 *
 * Checked against the configured currencies rather than a length/shape rule,
 * so `'ZZZ'` is refused instead of being quietly treated as a two-decimal
 * currency.
 */
export const currencyCodeSchema = z
  .string()
  .regex(CURRENCY_PATTERN, 'Expected an uppercase ISO 4217 code such as "USD"')
  .refine(
    (code) => !CURRENCY_PATTERN.test(code) || isKnownCurrency(code),
    'Unsupported currency code',
  )
  .describe('ISO 4217 currency code, e.g. "USD"');

/**
 * Transport and persistence schema for a monetary amount.
 *
 * Validates the plain shape; convert to a `Money` with `Money.fromJSON()`
 * once validated. It does not check the amount's scale against the currency:
 * `{ amount: '1.005', currency: 'USD' }` passes, so round in the handler if
 * the scale matters.
 */
export const moneySchema = conformsTo<MoneyInterface>()(
  z.object({
    amount: moneyAmountSchema,
    currency: currencyCodeSchema,
  }),
);
