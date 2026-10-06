import { recoveryRecoverLoginSchema } from '../recovery-recover-login.schema.js';

describe('recoveryRecoverLoginSchema', () => {
  it('accepts a valid email', () => {
    expect(
      recoveryRecoverLoginSchema.parse({ email: 'user@example.com' }),
    ).toEqual({ email: 'user@example.com' });
  });

  it('rejects a malformed email', () => {
    expect(
      recoveryRecoverLoginSchema.safeParse({ email: 'not-an-email' }).success,
    ).toBe(false);
  });

  it('rejects a missing email', () => {
    expect(recoveryRecoverLoginSchema.safeParse({}).success).toBe(false);
  });
});
