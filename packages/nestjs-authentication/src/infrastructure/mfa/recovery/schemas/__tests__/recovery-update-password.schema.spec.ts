import { recoveryUpdatePasswordSchema } from '../recovery-update-password.schema.js';

describe('recoveryUpdatePasswordSchema', () => {
  const valid = { passcode: '123456', newPassword: 'a' };

  it('accepts a valid payload', () => {
    expect(recoveryUpdatePasswordSchema.parse(valid)).toEqual(valid);
  });

  it('accepts a single-character newPassword (faithful to legacy @IsString() with no minimum)', () => {
    expect(recoveryUpdatePasswordSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a newPassword longer than 72 characters', () => {
    const result = recoveryUpdatePasswordSchema.safeParse({
      ...valid,
      newPassword: 'a'.repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing passcode', () => {
    const { passcode: _passcode, ...rest } = valid;
    expect(recoveryUpdatePasswordSchema.safeParse(rest).success).toBe(false);
  });
});
