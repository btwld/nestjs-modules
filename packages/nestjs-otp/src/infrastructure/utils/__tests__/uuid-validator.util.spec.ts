import { uuidValidatorUtil } from '../uuid-validator.util.js';

describe(uuidValidatorUtil.name, () => {
  it('should return true when both strings match', () => {
    expect(uuidValidatorUtil('abc', 'abc')).toBe(true);
  });

  it('should return false when strings differ', () => {
    expect(uuidValidatorUtil('abc', 'xyz')).toBe(false);
  });
});
