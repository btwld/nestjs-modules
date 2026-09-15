import { refreshSchema } from '../refresh.schema.js';

describe('refreshSchema', () => {
  const validJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

  it('accepts a valid JWT', () => {
    expect(refreshSchema.parse({ refreshToken: validJwt })).toEqual({
      refreshToken: validJwt,
    });
  });

  it('rejects a non-JWT string', () => {
    const result = refreshSchema.safeParse({ refreshToken: 'not-a-jwt' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing refreshToken', () => {
    expect(refreshSchema.safeParse({}).success).toBe(false);
  });
});
