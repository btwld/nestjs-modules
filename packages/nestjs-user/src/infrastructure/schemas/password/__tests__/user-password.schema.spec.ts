import { userPasswordHashSchema } from '../user-password-hash.schema.js';
import { userPasswordUpdateSchema } from '../user-password-update.schema.js';
import { userPasswordSchema } from '../user-password.schema.js';

describe('userPasswordSchema', () => {
  it('accepts a valid password (>= 8 chars)', () => {
    expect(userPasswordSchema.parse({ password: 'longenough' })).toEqual({
      password: 'longenough',
    });
  });

  it('rejects a too-short password', () => {
    expect(userPasswordSchema.safeParse({ password: 'short' }).success).toBe(
      false,
    );
  });
});

describe('userPasswordHashSchema', () => {
  it('accepts a valid passwordHash', () => {
    expect(userPasswordHashSchema.parse({ passwordHash: 'hashed' })).toEqual({
      passwordHash: 'hashed',
    });
  });
});

describe('userPasswordUpdateSchema', () => {
  it('accepts password + passwordCurrent', () => {
    const payload = { password: 'longenough', passwordCurrent: 'oldpass1' };
    expect(userPasswordUpdateSchema.parse(payload)).toEqual(payload);
  });

  it('accepts passwordCurrent omitted (default policy has requireCurrent: false)', () => {
    const payload = { password: 'longenough' };
    expect(userPasswordUpdateSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a missing password', () => {
    expect(
      userPasswordUpdateSchema.safeParse({ passwordCurrent: 'oldpass1' })
        .success,
    ).toBe(false);
  });
});
