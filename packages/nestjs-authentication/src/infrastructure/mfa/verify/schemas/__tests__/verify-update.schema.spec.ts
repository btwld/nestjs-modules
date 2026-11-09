import { verifyUpdateSchema } from '../verify-update.schema.js';

describe('verifyUpdateSchema', () => {
  it('accepts a valid passcode', () => {
    expect(verifyUpdateSchema.parse({ passcode: '123456' })).toEqual({
      passcode: '123456',
    });
  });

  it('rejects a passcode longer than 36 characters', () => {
    const result = verifyUpdateSchema.safeParse({
      passcode: 'a'.repeat(37),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing passcode', () => {
    expect(verifyUpdateSchema.safeParse({}).success).toBe(false);
  });
});
