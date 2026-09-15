import { verifySchema } from '../verify.schema.js';

describe('verifySchema', () => {
  it('accepts a valid email', () => {
    expect(verifySchema.parse({ email: 'user@example.com' })).toEqual({
      email: 'user@example.com',
    });
  });

  it('rejects a malformed email', () => {
    expect(verifySchema.safeParse({ email: 'not-an-email' }).success).toBe(
      false,
    );
  });

  it('rejects a missing email', () => {
    expect(verifySchema.safeParse({}).success).toBe(false);
  });
});
