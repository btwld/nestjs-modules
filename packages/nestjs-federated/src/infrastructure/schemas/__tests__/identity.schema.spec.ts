import { identityCreateSchema } from '../identity-create.schema.js';
import { identitySchema } from '../identity.schema.js';

const validIdentity = {
  id: 'abc',
  version: 1,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-02'),
  dateDeleted: null,
  provider: 'google',
  subject: 'subject-123',
  user: { id: 'user-abc' },
};

describe('identitySchema', () => {
  it('accepts a valid identity entity', () => {
    expect(identitySchema.parse(validIdentity)).toEqual(validIdentity);
  });

  it('strips unknown keys', () => {
    const result = identitySchema.parse({ ...validIdentity, _internal: 'x' });
    expect(result).not.toHaveProperty('_internal');
  });

  it('rejects a missing user reference', () => {
    const { user: _user, ...rest } = validIdentity;
    expect(identitySchema.safeParse(rest).success).toBe(false);
  });
});

describe('identityCreateSchema', () => {
  const validCreate = {
    provider: 'google',
    subject: 'subject-123',
    user: { id: 'user-abc' },
  };

  it('accepts a valid create payload', () => {
    expect(identityCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('rejects a missing provider', () => {
    const { provider: _provider, ...rest } = validCreate;
    expect(identityCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing subject', () => {
    const { subject: _subject, ...rest } = validCreate;
    expect(identityCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing user reference', () => {
    const { user: _user, ...rest } = validCreate;
    expect(identityCreateSchema.safeParse(rest).success).toBe(false);
  });
});
