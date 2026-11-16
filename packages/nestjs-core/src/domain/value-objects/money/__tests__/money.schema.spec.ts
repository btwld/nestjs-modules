import { Money } from '../money.js';
import { moneySchema } from '../money.schema.js';

/**
 * A refusal must be a validation failure, never a crash: `safeParse` turns a
 * schema rejection into `success: false` but lets a thrown error (such as a
 * `DecimalError` from parsing an invalid amount) escape and fail the test.
 */
function expectRejected(input: unknown): void {
  expect(moneySchema.safeParse(input).success).toBe(false);
}

describe('moneySchema', () => {
  it('accepts an exact decimal string with a known currency', () => {
    expect(moneySchema.parse({ amount: '1234.56', currency: 'USD' })).toEqual({
      amount: '1234.56',
      currency: 'USD',
    });
  });

  it.each(['0', '-0.01', '100', '100.50', '100000000000000000000.000001'])(
    'accepts %s as an amount',
    (amount) => {
      expect(() =>
        moneySchema.parse({ amount, currency: 'USD' }),
      ).not.toThrow();
    },
  );

  /**
   * Forms a decimal parser would accept but `Money.toJSON()` never emits. They
   * are refused so a round trip through this schema cannot change the text of
   * an amount — `+1.25` and `1.25` would otherwise be two spellings of one
   * value arriving over the wire.
   */
  it.each(['+1.25', '1.', '.5', '-.5', '+0'])(
    'rejects %s, which Money never emits',
    (amount) => {
      expectRejected({ amount, currency: 'USD' });
    },
  );

  it('agrees with Money.of on the 38-digit limit', () => {
    const digits38 = '1234567890123456789.0123456789012345678';
    const digits39 = `${digits38}9`;

    expect(
      moneySchema.safeParse({ amount: digits38, currency: 'USD' }).success,
    ).toBe(true);
    expect(
      moneySchema.safeParse({ amount: digits39, currency: 'USD' }).success,
    ).toBe(false);
  });

  /**
   * The contract the README has to state: a client sending `100.5` rather than
   * `"100.5"` gets a 400. Accepting a JSON number here would let an inexact
   * amount through validation looking entirely valid, which is the failure the
   * whole value object exists to prevent.
   */
  it('rejects a JSON number', () => {
    expectRejected({ amount: 100.5, currency: 'USD' });
    expectRejected({ amount: 0, currency: 'USD' });
  });

  it.each(['1,234.56', '1e5', '', 'abc', 'NaN', '1.2.3', ' 1.5 '])(
    'rejects %s as an amount',
    (amount) => {
      expectRejected({ amount, currency: 'USD' });
    },
  );

  it('rejects a currency code that is not a real currency', () => {
    expectRejected({ amount: '1.00', currency: 'ZZZ' });
  });

  it.each(['us', 'usd', 'DOLLAR', ''])(
    'rejects %s as a currency',
    (currency) => {
      expectRejected({ amount: '1.00', currency });
    },
  );

  /**
   * `usd` names a supported currency in the wrong case; telling the client it
   * is unsupported would send them looking for the wrong problem.
   */
  it('tells a client a lowercase code is a format problem', () => {
    const result = moneySchema.safeParse({ amount: '1.00', currency: 'usd' });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Expected an uppercase ISO 4217 code such as "USD"',
    ]);
  });

  it('round-trips with Money', () => {
    const parsed = moneySchema.parse({ amount: '1234.56', currency: 'USD' });
    const money = Money.fromJSON(parsed);

    expect(money.toJSON()).toEqual(parsed);
  });

  it('accepts what Money produces', () => {
    const serialized = Money.of('1234.56', 'USD').toJSON();

    expect(() => moneySchema.parse(serialized)).not.toThrow();
  });
});
