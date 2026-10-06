import { localLoginSchema } from '../local-login.schema.js';

describe('localLoginSchema', () => {
  const valid = { username: 'user', password: 'pass' };

  it('accepts a valid login payload', () => {
    expect(localLoginSchema.parse(valid)).toEqual(valid);
  });

  it('accepts an empty password (faithful to legacy @IsString() with no minimum)', () => {
    expect(localLoginSchema.parse({ ...valid, password: '' })).toEqual({
      ...valid,
      password: '',
    });
  });

  it('rejects a username longer than 255 characters', () => {
    const result = localLoginSchema.safeParse({
      ...valid,
      username: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing password', () => {
    const { password: _password, ...rest } = valid;
    expect(localLoginSchema.safeParse(rest).success).toBe(false);
  });
});
