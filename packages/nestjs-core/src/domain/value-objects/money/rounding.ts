import { Decimal } from 'decimal.js';

import { RuntimeException } from '../../exceptions/runtime.exception.js';

/**
 * How a tie — a value exactly halfway between two representable results — is
 * resolved, and which way non-ties go.
 *
 * A string enum rather than the library's numeric constants so that a mode can
 * arrive as text from configuration. Each member documents its direction
 * explicitly, because
 * "half up" is ambiguous in English — it can mean away from zero or towards
 * positive infinity, and the two disagree on every negative tie.
 */
export enum RoundingMode {
  /** Ties away from zero. `2.675` → `2.68`, `-2.675` → `-2.68`. */
  HalfUp = 'halfUp',
  /** Ties towards zero. `2.675` → `2.67`, `-2.675` → `-2.67`. */
  HalfDown = 'halfDown',
  /** Ties to the even neighbour — "banker's rounding". `2.675` → `2.68`, `2.665` → `2.66`. */
  HalfEven = 'halfEven',
  /** Always away from zero. `2.671` → `2.68`, `-2.671` → `-2.68`. */
  Up = 'up',
  /** Always towards zero — truncation. `2.679` → `2.67`, `-2.679` → `-2.67`. */
  Down = 'down',
}

const DECIMAL_ROUNDING: Readonly<Record<RoundingMode, Decimal.Rounding>> =
  Object.freeze({
    [RoundingMode.HalfUp]: Decimal.ROUND_HALF_UP,
    [RoundingMode.HalfDown]: Decimal.ROUND_HALF_DOWN,
    [RoundingMode.HalfEven]: Decimal.ROUND_HALF_EVEN,
    [RoundingMode.Up]: Decimal.ROUND_UP,
    [RoundingMode.Down]: Decimal.ROUND_DOWN,
  });

/**
 * A rounding instruction: how many decimal places, and how to resolve a tie.
 *
 * There is no default. `Money` arithmetic never rounds on its own, so every
 * rounding in a calculation is a `Rounding` written at the point it happens —
 * which is what makes a specification like "round each fee half-up to two
 * decimals as it is calculated, then subtotal" reproducible instead of
 * emergent.
 *
 * @example
 * ```ts
 * const fee = lineAmount
 *   .multiply(rate)
 *   .round(Rounding.halfUp(2));
 * ```
 */
export class Rounding {
  private constructor(
    /** Decimal places to keep. */
    readonly scale: number,
    /** How to resolve a tie. */
    readonly mode: RoundingMode,
  ) {
    Object.freeze(this);
  }

  /**
   * A rounding for a mode chosen at runtime — typically text read from
   * configuration, such as `'halfEven'`. Unknown text is refused. Prefer the
   * named factories when the mode is fixed.
   */
  static of(scale: number, mode: RoundingMode | string): Rounding {
    if (!isRoundingMode(mode)) {
      throw new RuntimeException({
        message: '"%s" is not a rounding mode — expected one of %s',
        messageParams: [mode, Object.values(RoundingMode).join(', ')],
        fault: 'usage',
      });
    }

    return new Rounding(assertScale(scale), mode);
  }

  /** Ties away from zero — the usual accounting convention. */
  static halfUp(scale: number): Rounding {
    return new Rounding(assertScale(scale), RoundingMode.HalfUp);
  }

  /** Ties towards zero. */
  static halfDown(scale: number): Rounding {
    return new Rounding(assertScale(scale), RoundingMode.HalfDown);
  }

  /** Ties to the even neighbour — "banker's rounding". */
  static halfEven(scale: number): Rounding {
    return new Rounding(assertScale(scale), RoundingMode.HalfEven);
  }

  /** Always away from zero. */
  static up(scale: number): Rounding {
    return new Rounding(assertScale(scale), RoundingMode.Up);
  }

  /** Always towards zero — truncation. */
  static down(scale: number): Rounding {
    return new Rounding(assertScale(scale), RoundingMode.Down);
  }

  /**
   * The decimal.js constant for this mode. Internal to the money
   * implementation; callers work in {@link RoundingMode}.
   */
  get decimalRounding(): Decimal.Rounding {
    return DECIMAL_ROUNDING[this.mode];
  }
}

function isRoundingMode(mode: string): mode is RoundingMode {
  return Object.values<string>(RoundingMode).includes(mode);
}

/**
 * A scale has to be an integer from 0 to 20. `-1` would round to tens, which
 * is never what a monetary scale means, and a fractional scale is
 * meaningless. Shared with `Money.toFixed`.
 */
export function assertScale(scale: number): number {
  if (!Number.isInteger(scale) || scale < 0 || scale > 20) {
    throw new RuntimeException({
      message: 'A scale must be an integer from 0 to 20, got %s',
      messageParams: [String(scale)],
      fault: 'usage',
    });
  }

  return scale;
}
