import { recoveryRecoverPasswordSchema } from '../recovery-recover-password.schema.js';

describe('recoveryRecoverPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(
      recoveryRecoverPasswordSchema.parse({ email: 'user@example.com' }),
    ).toEqual({ email: 'user@example.com' });
  });

  it('rejects a malformed email', () => {
    expect(
      recoveryRecoverPasswordSchema.safeParse({ email: 'not-an-email' })
        .success,
    ).toBe(false);
  });

  it('rejects a missing email', () => {
    expect(recoveryRecoverPasswordSchema.safeParse({}).success).toBe(false);
  });
});
