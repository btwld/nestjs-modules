import { recoveryValidatePasscodeSchema } from '../recovery-validate-passcode.schema.js';

describe('recoveryValidatePasscodeSchema', () => {
  it('accepts a valid passcode', () => {
    expect(
      recoveryValidatePasscodeSchema.parse({ passcode: '123456' }),
    ).toEqual({ passcode: '123456' });
  });

  it('rejects a passcode longer than 36 characters', () => {
    const result = recoveryValidatePasscodeSchema.safeParse({
      passcode: 'a'.repeat(37),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing passcode', () => {
    expect(recoveryValidatePasscodeSchema.safeParse({}).success).toBe(false);
  });
});
