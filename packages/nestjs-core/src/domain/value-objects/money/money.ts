import { Decimal } from 'decimal.js';

import { assertKnownCurrency, minorUnitsOf } from './currency.js';
import { CurrencyMismatchException } from './exceptions/currency-mismatch.exception.js';
import { MoneyInvalidAmountException } from './exceptions/money-invalid-amount.exception.js';
import { type MoneyInterface } from './interfaces/money.interface.js';
import { assertScale, Rounding } from './rounding.js';

/**
 * The decimal constructor this module computes with.
 *
 * **Cloned, not the global one, and that is load-bearing twice over.**
 *
 * decimal.js rounds the result of *every* arithmetic operation — `plus`,
 * `minus` and `times`, not only `div` — to `Decimal.precision` significant
 * digits, which defaults to 20. A `numeric(19,4)` amount already carries 19
 * significant digits, so one multiplication by a six-digit rate overflows the
 * default and silently loses the tail: at precision 20,
 * `1234567890123456789 × 0.071250` returns `87962962171296296.216` where the
 * exact product is `87962962171296296.21625`. Short test values never reveal
 * it.
 *
 * And `Decimal.set()` mutates process-global state. Configuring the global
 * constructor here would change the arithmetic of any consumer that also uses
 * decimal.js, and theirs would change ours.
 *
 * 60 digits leaves headroom over the 38-digit input limit: a `numeric(19,4)`
 * amount multiplied by a long rate stays exact, while staying far from the
 * 1e9 maximum where decimal.js gets slow.
 */
const D = Decimal.clone({ precision: 60 });

/**
 * An exact monetary amount in a single currency.
 *
 * Immutable: every operation returns a new instance and none mutates the
 * receiver.
 *
 * **Arithmetic never rounds.** `add`, `subtract` and `multiply` keep full
 * precision; rounding happens only where a {@link round} is written, and
 * {@link divide} refuses to proceed without being told how. That is what
 * makes an ordered specification —
 * "round each fee half-up to two decimals as it is calculated, subtotal the
 * amounts and the fees separately, then subtract" — reproducible rather than a
 * property of whichever operations happened to run first.
 *
 * Inputs are limited to 38 significant digits, the widest portable SQL
 * `numeric`. Arithmetic is exact while a result fits in 60 significant
 * digits, which ordinary amounts and rates never approach.
 *
 * @example
 * ```ts
 * const fee = Money.of('1234.56', 'USD')
 *   .multiply('0.27')              // exact, unrounded
 *   .round(Rounding.halfUp(2));    // 333.33 USD
 * ```
 */
export class Money {
  private constructor(
    private readonly value: Decimal,
    /** ISO 4217 code this amount is denominated in. */
    readonly currency: string,
  ) {
    Object.freeze(this);
  }

  // ---------------------------------------------------------------- factories

  /**
   * Build an amount from an exact representation.
   *
   * Accepts a decimal string (`'1234.56'`), a `bigint` or a `Decimal`.
   * **Does not accept `number`** — see {@link fromNumber}.
   */
  static of(amount: string | bigint | Decimal, currency: string): Money {
    assertKnownCurrency(currency);

    return new Money(toDecimal(amount, false), currency);
  }

  /**
   * Build an amount from a `number`, acknowledging the hazard.
   *
   * The literal itself is usually fine: decimal.js reads a number's shortest
   * round-trip representation, so any JSON literal of up to 15 significant
   * digits converts exactly. What a `number` cannot tell you is what has
   * already happened to it — `0.1 + 0.2` arrives as `0.30000000000000004` and
   * nothing at the call site shows that. This method exists so that choosing
   * to accept one is visible in review rather than implicit.
   */
  static fromNumber(amount: number, currency: string): Money {
    assertKnownCurrency(currency);

    return new Money(toDecimal(amount, true), currency);
  }

  /** Zero in `currency`. */
  static zero(currency: string): Money {
    assertKnownCurrency(currency);

    return new Money(new D(0), currency);
  }

  /**
   * Build from the persisted/transport shape.
   */
  static fromJSON(plain: MoneyInterface): Money {
    return Money.of(plain.amount, plain.currency);
  }

  // --------------------------------------------------------------- arithmetic

  /** Sum. Both operands must be in the same currency. */
  add(other: Money): Money {
    this.assertSameCurrency(other, 'add');

    return new Money(this.value.plus(other.value), this.currency);
  }

  /** Difference. Both operands must be in the same currency. */
  subtract(other: Money): Money {
    this.assertSameCurrency(other, 'subtract');

    return new Money(this.value.minus(other.value), this.currency);
  }

  /**
   * Scale by a rate or a quantity. Exact up to 60 significant digits; nothing
   * is rounded.
   *
   * A fractional `number` is refused — pass `'0.27'`, not `0.27`. An *integer*
   * `number` is accepted, because a count of items carries none of the hazard
   * a fractional float does and `multiply(3)` should not have to be written
   * `multiply('3')`.
   */
  multiply(factor: string | number | bigint | Decimal): Money {
    return new Money(
      this.value.times(toDecimal(factor, 'integer')),
      this.currency,
    );
  }

  /**
   * Divide, rounding as instructed.
   *
   * `rounding` is required rather than defaulted: a third of a penny has no
   * exact representation, so division always makes a choice, and an
   * unannotated choice in a money pipeline is the bug this class exists to
   * prevent. To split an amount across recipients without losing a unit, use
   * {@link allocate} instead.
   */
  divide(
    divisor: string | number | bigint | Decimal,
    rounding: Rounding,
  ): Money {
    // Typed as required, but a JavaScript caller can still omit it.
    if (!(rounding instanceof Rounding)) {
      throw new MoneyInvalidAmountException(
        String(rounding),
        'divide needs a Rounding, e.g. Rounding.halfEven(2)',
      );
    }

    const d = toDecimal(divisor, 'integer');

    if (d.isZero()) {
      throw new MoneyInvalidAmountException(divisor, 'division by zero');
    }

    return new Money(
      this.value
        .div(d)
        .toDecimalPlaces(rounding.scale, rounding.decimalRounding),
      this.currency,
    );
  }

  /** Sign-flipped. */
  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  /** Magnitude. */
  abs(): Money {
    return new Money(this.value.absoluteValue(), this.currency);
  }

  // ----------------------------------------------------------------- rounding

  /** Round to an explicit scale and mode. */
  round(rounding: Rounding): Money {
    return new Money(
      this.value.toDecimalPlaces(rounding.scale, rounding.decimalRounding),
      this.currency,
    );
  }

  // --------------------------------------------------------------- allocation

  /**
   * Split across recipients in proportion to `weights`, losing nothing.
   *
   * The parts sum **exactly** to this amount _at the currency's minor-unit
   * scale_. Proportional division almost never divides evenly into whole
   * minor units, so the remainder is distributed one unit at a time, largest
   * fractional part first, ties going to the earlier index — deterministic,
   * so the same inputs always produce the same split.
   *
   * `$100` across three equal shares gives `[33.34, 33.33, 33.33]`, not three
   * parts of `33.33` and a lost cent.
   *
   * **Sub-unit precision is dropped, not distributed.** The whole is floored
   * to the minor unit before splitting, so `$10.005` across two shares gives
   * two parts of `$5.00` and the half-cent is gone. Round to the scale you
   * intend before allocating if that half-cent has to land somewhere.
   *
   * A negative amount splits as the mirror of its positive: `-$100` across
   * three gives `[-33.34, -33.33, -33.33]`, and `-$10.005` across two gives
   * two parts of `-$5.00`.
   *
   * @param weights - Non-negative, at least one greater than zero.
   */
  allocate(weights: readonly (number | string)[]): Money[] {
    if (weights.length === 0) {
      throw new MoneyInvalidAmountException(
        '[]',
        'allocate needs at least one weight',
      );
    }

    const decimalWeights = weights.map((weight) => {
      const w = toDecimal(weight, true);

      if (w.isNegative() && !w.isZero()) {
        throw new MoneyInvalidAmountException(
          weight,
          'allocate weights cannot be negative',
        );
      }

      return w;
    });

    const total = decimalWeights.reduce((sum, w) => sum.plus(w), new D(0));

    if (total.isZero()) {
      throw new MoneyInvalidAmountException(
        weights.join(','),
        'allocate needs at least one weight greater than zero',
      );
    }

    const places = minorUnitsOf(this.currency);
    const unit = new D(10).pow(-places);

    // Split the magnitude and restore the sign at the end, so a negative
    // amount mirrors its positive instead of flooring away from zero.
    const magnitude = this.value.abs();

    // Floor every share to a whole minor unit, then hand the shortfall back
    // out. Flooring (rather than rounding) guarantees the shortfall is
    // non-negative and smaller than one unit per recipient, so the loop below
    // always terminates.
    const shares = decimalWeights.map((weight) => {
      const exact = magnitude.times(weight).div(total);

      return {
        floored: exact.toDecimalPlaces(places, Decimal.ROUND_FLOOR),
        remainder: exact.minus(
          exact.toDecimalPlaces(places, Decimal.ROUND_FLOOR),
        ),
      };
    });

    const distributed = shares.reduce(
      (sum, share) => sum.plus(share.floored),
      new D(0),
    );
    let shortfall = magnitude
      .toDecimalPlaces(places, Decimal.ROUND_FLOOR)
      .minus(distributed);

    // Largest fractional part first; ties keep their original order so the
    // split is reproducible.
    const order = shares
      .map((share, index) => ({ index, remainder: share.remainder }))
      .sort((a, b) => {
        const byRemainder = b.remainder.comparedTo(a.remainder);

        return byRemainder !== 0 ? byRemainder : a.index - b.index;
      });

    const amounts = shares.map((share) => share.floored);

    for (const { index } of order) {
      if (shortfall.lessThan(unit)) break;

      amounts[index] = amounts[index].plus(unit);
      shortfall = shortfall.minus(unit);
    }

    const negative = this.value.isNegative();

    return amounts.map(
      (amount) =>
        new Money(negative ? amount.negated() : amount, this.currency),
    );
  }

  // ---------------------------------------------------------------- comparison

  /** `-1`, `0` or `1`. Both operands must be in the same currency. */
  compare(other: Money): number {
    this.assertSameCurrency(other, 'compare');

    return this.value.comparedTo(other.value);
  }

  /** Same currency and same numeric value. `1.50` equals `1.5`. */
  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  greaterThan(other: Money): boolean {
    return this.compare(other) > 0;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.compare(other) >= 0;
  }

  lessThan(other: Money): boolean {
    return this.compare(other) < 0;
  }

  lessThanOrEqual(other: Money): boolean {
    return this.compare(other) <= 0;
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.greaterThan(0);
  }

  isNegative(): boolean {
    return this.value.isNegative() && !this.value.isZero();
  }

  // ------------------------------------------------------------- serialization

  /**
   * The exact amount as a plain decimal string, never exponential.
   *
   * Without `scale`, nothing is imposed: an unrounded intermediate serializes
   * with its full precision, which is the honest representation.
   *
   * With `scale`, the amount is padded with zeros to that many places —
   * `1.5` at scale 2 is `"1.50"`. It never rounds: an amount with more
   * places than `scale` is refused, so call {@link round} first.
   */
  toFixed(scale?: number): string {
    if (scale === undefined) return this.value.toFixed();

    if (this.value.decimalPlaces() > assertScale(scale)) {
      throw new MoneyInvalidAmountException(
        this.value.toFixed(),
        `has more than ${scale} decimal places — round it before formatting`,
      );
    }

    return this.value.toFixed(scale);
  }

  /** `"1234.56 USD"` — intended for logs and error messages. */
  toString(): string {
    return `${this.toFixed()} ${this.currency}`;
  }

  /** The persisted/transport shape. */
  toJSON(): MoneyInterface {
    return { amount: this.toFixed(), currency: this.currency };
  }

  // ---------------------------------------------------------------- internals

  private assertSameCurrency(other: Money, operation: string): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException(
        operation,
        this.currency,
        other.currency,
      );
    }
  }
}

/**
 * The most significant digits an input may carry — the widest portable SQL
 * `numeric`. Well inside the 60-digit working precision, so a product of an
 * amount and an ordinary rate stays exact.
 */
export const MAX_INPUT_DIGITS = 38;

/**
 * Coerce an input to an exact `Decimal`, refusing one wider than
 * {@link MAX_INPUT_DIGITS}.
 *
 * `allowNumber` controls how a `number` is treated: `false` refuses it
 * outright, `'integer'` accepts only whole numbers (a quantity), `true`
 * accepts any finite number (the explicit {@link Money.fromNumber} path and
 * allocation weights).
 */
function toDecimal(
  value: string | number | bigint | Decimal,
  allowNumber: boolean | 'integer',
): Decimal {
  const decimal = parseDecimal(value, allowNumber);

  if (decimal.precision(true) > MAX_INPUT_DIGITS) {
    throw new MoneyInvalidAmountException(
      value,
      `has more than ${MAX_INPUT_DIGITS} significant digits`,
    );
  }

  return decimal;
}

function parseDecimal(
  value: string | number | bigint | Decimal,
  allowNumber: boolean | 'integer',
): Decimal {
  if (typeof value === 'number') {
    if (allowNumber === false) {
      throw new MoneyInvalidAmountException(
        value,
        'a number cannot carry evidence of the arithmetic already applied to ' +
          'it — pass a decimal string, or use Money.fromNumber() to accept ' +
          'one deliberately',
      );
    }

    if (!Number.isFinite(value)) {
      throw new MoneyInvalidAmountException(value, 'not a finite number');
    }

    if (allowNumber === 'integer' && !Number.isInteger(value)) {
      throw new MoneyInvalidAmountException(
        value,
        'a fractional number is refused here because a float rate loses ' +
          `precision invisibly — pass '${value}' as a string instead`,
      );
    }

    return new D(value);
  }

  if (typeof value === 'bigint') {
    return new D(value.toString());
  }

  // `isDecimal` rather than `instanceof`: under pnpm a consumer can hold a
  // `Decimal` from their own installed copy, which fails the prototype check
  // and would fall through to the string branch and throw a bare `TypeError`.
  // decimal.js tags its instances for exactly this case, and `new D()` reads
  // a foreign instance correctly.
  if (Decimal.isDecimal(value)) {
    const decimal = new D(value);

    if (!decimal.isFinite()) {
      throw new MoneyInvalidAmountException(value, 'not a finite number');
    }

    return decimal;
  }

  // The static type excludes these, but a nullable column or an unvalidated
  // JavaScript caller can still pass one.
  if (typeof value !== 'string') {
    throw new MoneyInvalidAmountException(
      value,
      'expected a decimal string, bigint or Decimal',
    );
  }

  const trimmed = value.trim();

  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
    throw new MoneyInvalidAmountException(
      value,
      'expected a plain decimal string such as "1234.56"',
    );
  }

  return new D(trimmed);
}
