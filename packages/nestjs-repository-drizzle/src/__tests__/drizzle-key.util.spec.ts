import { keyOf } from '../repository/drizzle-key.util.js';

describe('keyOf', () => {
  it('keys bigint values', () => {
    expect(keyOf([BigInt(1), 'a'])).toEqual(keyOf([BigInt(1), 'a']));
    expect(keyOf([BigInt(1)])).not.toEqual(keyOf([BigInt(2)]));
  });

  it('keeps a bigint apart from a string of the same digits', () => {
    expect(keyOf([BigInt(1)])).not.toEqual(keyOf(['1']));
  });
});
