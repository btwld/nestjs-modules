import { authenticationResponseSchema } from '../authentication-response.schema.js';

describe('authenticationResponseSchema', () => {
  const valid = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  it('accepts a valid response', () => {
    expect(authenticationResponseSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a missing accessToken', () => {
    const { accessToken: _accessToken, ...rest } = valid;
    expect(authenticationResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('strips unknown keys', () => {
    const result = authenticationResponseSchema.parse({
      ...valid,
      _internal: 'x',
    });
    expect(result).not.toHaveProperty('_internal');
  });
});
