import { invitationAcceptSchema } from '../invitation-accept.schema.js';
import { invitationCreateByEmailSchema } from '../invitation-create-by-email.schema.js';
import { invitationCreateSchema } from '../invitation-create.schema.js';
import { invitationPaginatedSchema } from '../invitation-paginated.schema.js';
import { invitationSchema } from '../invitation.schema.js';

const validInvitation = {
  id: 'abc',
  version: 1,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-02'),
  dateDeleted: null,
  active: true,
  code: 'code-123',
  category: 'user',
  constraints: { foo: 'bar' },
  userId: 'user-abc',
  dateAccepted: null,
  dateRevoked: null,
};

describe('invitationSchema', () => {
  it('accepts a valid invitation entity', () => {
    expect(invitationSchema.parse(validInvitation)).toEqual(validInvitation);
  });

  it('defaults active to true when omitted (matching legacy class-property default)', () => {
    const { active: _active, ...rest } = validInvitation;
    expect(invitationSchema.parse(rest)).toEqual(validInvitation);
  });

  it('accepts an omitted constraints field', () => {
    const { constraints: _constraints, ...rest } = validInvitation;
    const result = invitationSchema.parse(rest);
    expect(result).not.toHaveProperty('constraints');
  });

  it('strips unknown keys', () => {
    const result = invitationSchema.parse({
      ...validInvitation,
      _internal: 'x',
    });
    expect(result).not.toHaveProperty('_internal');
  });
});

describe('invitationCreateSchema', () => {
  const validCreate = {
    category: 'user',
    userId: 'user-abc',
    code: 'code-123',
    constraints: { foo: 'bar' },
  };

  it('accepts a valid create payload', () => {
    expect(invitationCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('accepts an omitted constraints field', () => {
    const { constraints: _constraints, ...rest } = validCreate;
    expect(invitationCreateSchema.parse(rest)).toEqual(rest);
  });

  it('rejects a missing category', () => {
    const { category: _category, ...rest } = validCreate;
    expect(invitationCreateSchema.safeParse(rest).success).toBe(false);
  });
});

describe('invitationCreateByEmailSchema', () => {
  const validCreate = {
    category: 'user',
    email: 'invitee@example.com',
    constraints: { foo: 'bar' },
  };

  it('accepts a valid create-by-email payload', () => {
    expect(invitationCreateByEmailSchema.parse(validCreate)).toEqual(
      validCreate,
    );
  });

  it('rejects a malformed email', () => {
    expect(
      invitationCreateByEmailSchema.safeParse({
        ...validCreate,
        email: 'not-an-email',
      }).success,
    ).toBe(false);
  });
});

describe('invitationAcceptSchema', () => {
  it('accepts a passcode with no payload', () => {
    expect(invitationAcceptSchema.parse({ passcode: '123456' })).toEqual({
      passcode: '123456',
    });
  });

  it('accepts a passcode with a payload', () => {
    const payload = { passcode: '123456', payload: { newPassword: 'x' } };
    expect(invitationAcceptSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a missing passcode', () => {
    expect(invitationAcceptSchema.safeParse({}).success).toBe(false);
  });
});

describe('invitationPaginatedSchema', () => {
  it('accepts a paginated list of invitation entities', () => {
    const payload = {
      data: [validInvitation],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    };
    expect(invitationPaginatedSchema.parse(payload)).toEqual(payload);
  });
});
