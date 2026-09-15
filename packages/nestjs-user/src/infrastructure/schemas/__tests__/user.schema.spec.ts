import { userCreateBatchSchema } from '../user-create-batch.schema.js';
import { userCreateSchema } from '../user-create.schema.js';
import { userPaginatedSchema } from '../user-paginated.schema.js';
import { userUpdateSchema } from '../user-update.schema.js';
import { userSchema } from '../user.schema.js';

const validUser = {
  id: 'abc',
  version: 1,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-02'),
  dateDeleted: null,
  email: 'john@example.com',
  username: 'john',
  active: true,
};

describe('userSchema', () => {
  it('accepts a valid user entity', () => {
    expect(userSchema.parse(validUser)).toEqual(validUser);
  });

  it('accepts a non-`.email()`-shaped string for email unchanged (response never re-validates format)', () => {
    const result = userSchema.parse({ ...validUser, email: 'not-an-email' });
    expect(result.email).toBe('not-an-email');
  });

  it('strips unknown keys', () => {
    const result = userSchema.parse({ ...validUser, _internal: 'x' });
    expect(result).not.toHaveProperty('_internal');
  });
});

describe('userCreateSchema', () => {
  const validCreate = { username: 'john', email: 'john@example.com' };

  it('accepts a valid create payload without a password', () => {
    expect(userCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('accepts an optional password (>= 8 chars)', () => {
    const payload = { ...validCreate, password: 'longenough' };
    expect(userCreateSchema.parse(payload)).toEqual(payload);
  });

  it('accepts an optional active flag', () => {
    const payload = { ...validCreate, active: false };
    expect(userCreateSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a malformed email', () => {
    expect(
      userCreateSchema.safeParse({ ...validCreate, email: 'not-an-email' })
        .success,
    ).toBe(false);
  });

  it('rejects a too-short password', () => {
    expect(
      userCreateSchema.safeParse({ ...validCreate, password: 'short' }).success,
    ).toBe(false);
  });

  it('has no passwordHash field (fixes the silent-drop bug — see file docstring)', () => {
    expect(userCreateSchema.shape).not.toHaveProperty('passwordHash');
  });
});

describe('userUpdateSchema', () => {
  it('accepts an empty payload (both fields optional)', () => {
    expect(userUpdateSchema.parse({})).toEqual({});
  });

  it('accepts email + active', () => {
    const payload = { email: 'new@example.com', active: false };
    expect(userUpdateSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a malformed email', () => {
    expect(userUpdateSchema.safeParse({ email: 'not-an-email' }).success).toBe(
      false,
    );
  });

  it('has no id field (route param is authoritative — see file docstring)', () => {
    expect(userUpdateSchema.shape).not.toHaveProperty('id');
  });
});

describe('userPaginatedSchema', () => {
  it('accepts a paginated list of user entities', () => {
    const payload = {
      data: [validUser],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    };
    expect(userPaginatedSchema.parse(payload)).toEqual(payload);
  });
});

describe('userCreateBatchSchema', () => {
  it('accepts a bulk array of user create payloads', () => {
    const payload = { bulk: [{ username: 'john', email: 'john@example.com' }] };
    expect(userCreateBatchSchema.parse(payload)).toEqual(payload);
  });

  it('rejects an empty bulk array (matching legacy @ArrayNotEmpty())', () => {
    expect(userCreateBatchSchema.safeParse({ bulk: [] }).success).toBe(false);
  });
});
