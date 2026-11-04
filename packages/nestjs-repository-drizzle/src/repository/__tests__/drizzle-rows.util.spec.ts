import { asStored } from '../drizzle-rows.util.js';

describe(asStored.name, () => {
  it.each([
    ['an invalid date', new Date(Number.NaN)],
    ['NaN', Number.NaN],
    ['a bigint', BigInt(1)],
  ])('keeps %s apart from null', (_, value) => {
    expect(asStored(value)).not.toBe(asStored(null));
  });

  it('reads a valid date as the date it holds', () => {
    expect(asStored(new Date('2026-01-02T03:04:05.000Z'))).toBe(
      asStored(new Date('2026-01-02T03:04:05.000Z')),
    );
  });
});
