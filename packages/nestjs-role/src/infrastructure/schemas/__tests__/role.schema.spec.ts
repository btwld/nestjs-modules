import { roleAssignmentCreateBatchSchema } from '../role-assignment-create-batch.schema.js';
import { roleAssignmentCreateSchema } from '../role-assignment-create.schema.js';
import { roleAssignmentPaginatedSchema } from '../role-assignment-paginated.schema.js';
import { roleAssignmentSchema } from '../role-assignment.schema.js';
import { roleCreateBatchSchema } from '../role-create-batch.schema.js';
import { roleCreateSchema } from '../role-create.schema.js';
import { rolePaginatedSchema } from '../role-paginated.schema.js';
import { roleUpdateSchema } from '../role-update.schema.js';
import { roleSchema } from '../role.schema.js';

const validRole = {
  id: 'abc',
  version: 1,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-02'),
  dateDeleted: null,
  name: 'admin',
  description: 'Administrator role',
};

describe('roleSchema', () => {
  it('accepts a valid role entity', () => {
    expect(roleSchema.parse(validRole)).toEqual(validRole);
  });

  it('strips unknown keys', () => {
    const result = roleSchema.parse({ ...validRole, _internal: 'x' });
    expect(result).not.toHaveProperty('_internal');
  });
});

describe('roleCreateSchema', () => {
  const validCreate = { name: 'admin', description: 'Administrator role' };

  it('accepts a valid create payload', () => {
    expect(roleCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('defaults description to "" when omitted (matching legacy @IsOptional())', () => {
    const { description: _description, ...rest } = validCreate;
    expect(roleCreateSchema.parse(rest)).toEqual({ ...rest, description: '' });
  });

  it('rejects a missing name', () => {
    const { name: _name, ...rest } = validCreate;
    expect(roleCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(
      roleCreateSchema.safeParse({ ...validCreate, name: '' }).success,
    ).toBe(false);
  });

  it('rejects a whitespace-only name', () => {
    expect(
      roleCreateSchema.safeParse({ ...validCreate, name: '   ' }).success,
    ).toBe(false);
  });

  it('rejects an empty payload', () => {
    expect(roleCreateSchema.safeParse({}).success).toBe(false);
  });
});

describe('roleUpdateSchema', () => {
  const validUpdate = { name: 'editor', description: 'Editor role' };

  it('accepts a valid update payload', () => {
    expect(roleUpdateSchema.parse(validUpdate)).toEqual(validUpdate);
  });

  it('leaves description untouched (unset) when omitted', () => {
    const { description: _description, ...rest } = validUpdate;
    expect(roleUpdateSchema.parse(rest)).toEqual(rest);
  });

  it('leaves name untouched (unset) when only description is sent', () => {
    const { name: _name, ...rest } = validUpdate;
    const result = roleUpdateSchema.parse(rest);
    expect(result).toEqual(rest);
    expect(result).not.toHaveProperty('name');
  });

  it('rejects an empty name', () => {
    expect(
      roleUpdateSchema.safeParse({ ...validUpdate, name: '' }).success,
    ).toBe(false);
  });

  it('rejects a whitespace-only name', () => {
    expect(
      roleUpdateSchema.safeParse({ ...validUpdate, name: '   ' }).success,
    ).toBe(false);
  });

  it('accepts an empty payload as a no-op patch', () => {
    expect(roleUpdateSchema.parse({})).toEqual({});
  });
});

describe('rolePaginatedSchema', () => {
  it('accepts a paginated list of role entities', () => {
    const payload = {
      data: [validRole],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    };
    expect(rolePaginatedSchema.parse(payload)).toEqual(payload);
  });
});

const validRoleAssignment = {
  id: 'def',
  version: 1,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-02'),
  dateDeleted: null,
  roleId: 'role-1',
  assigneeId: 'user-1',
};

describe('roleAssignmentSchema', () => {
  it('accepts a valid role assignment entity', () => {
    expect(roleAssignmentSchema.parse(validRoleAssignment)).toEqual(
      validRoleAssignment,
    );
  });

  it('rejects a missing roleId', () => {
    const { roleId: _roleId, ...rest } = validRoleAssignment;
    expect(roleAssignmentSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an empty roleId (matching legacy @IsNotEmpty())', () => {
    expect(
      roleAssignmentSchema.safeParse({ ...validRoleAssignment, roleId: '' })
        .success,
    ).toBe(false);
  });

  it('rejects an empty assigneeId (matching legacy @IsNotEmpty())', () => {
    expect(
      roleAssignmentSchema.safeParse({
        ...validRoleAssignment,
        assigneeId: '',
      }).success,
    ).toBe(false);
  });
});

describe('roleAssignmentCreateSchema', () => {
  const validCreate = { roleId: 'role-1', assigneeId: 'user-1' };

  it('accepts a valid create payload', () => {
    expect(roleAssignmentCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('rejects a missing assigneeId', () => {
    const { assigneeId: _assigneeId, ...rest } = validCreate;
    expect(roleAssignmentCreateSchema.safeParse(rest).success).toBe(false);
  });
});

describe('roleAssignmentPaginatedSchema', () => {
  it('accepts a paginated list of role assignment entities', () => {
    const payload = {
      data: [validRoleAssignment],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    };
    expect(roleAssignmentPaginatedSchema.parse(payload)).toEqual(payload);
  });
});

describe('roleCreateBatchSchema', () => {
  it('accepts a bulk array of role create payloads', () => {
    const payload = { bulk: [{ name: 'admin', description: 'Admin role' }] };
    expect(roleCreateBatchSchema.parse(payload)).toEqual(payload);
  });

  it('rejects an empty bulk array (matching legacy @ArrayNotEmpty())', () => {
    expect(roleCreateBatchSchema.safeParse({ bulk: [] }).success).toBe(false);
  });
});

describe('roleAssignmentCreateBatchSchema', () => {
  it('accepts a bulk array of role assignment create payloads', () => {
    const payload = {
      bulk: [{ roleId: 'role-1', assigneeId: 'user-1' }],
    };
    expect(roleAssignmentCreateBatchSchema.parse(payload)).toEqual(payload);
  });

  it('rejects an empty bulk array (matching legacy @ArrayNotEmpty())', () => {
    expect(
      roleAssignmentCreateBatchSchema.safeParse({ bulk: [] }).success,
    ).toBe(false);
  });
});
