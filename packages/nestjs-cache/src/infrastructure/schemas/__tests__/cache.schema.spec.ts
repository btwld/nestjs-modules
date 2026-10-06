import { cacheCreateSchema } from '../cache-create.schema.js';
import { cachePaginatedSchema } from '../cache-paginated.schema.js';
import { cacheUpdateSchema } from '../cache-update.schema.js';
import { cacheSchema } from '../cache.schema.js';

const validCache = {
  id: 'abc',
  version: 1,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-02'),
  dateDeleted: null,
  key: 'dashboard-1',
  type: 'filter',
  data: '{}',
  assigneeId: 'user-1',
  expirationDate: null,
};

describe('cacheSchema', () => {
  it('accepts a valid cache entity', () => {
    expect(cacheSchema.parse(validCache)).toEqual(validCache);
  });

  it('rejects a missing assigneeId', () => {
    const { assigneeId: _assigneeId, ...rest } = validCache;
    expect(cacheSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an empty assigneeId (matching legacy @IsNotEmpty())', () => {
    expect(
      cacheSchema.safeParse({ ...validCache, assigneeId: '' }).success,
    ).toBe(false);
  });

  it('does not require expiresIn (it is request-only, not part of the response shape)', () => {
    const result = cacheSchema.parse(validCache);
    expect(result).not.toHaveProperty('expiresIn');
  });

  it('strips unknown keys', () => {
    const result = cacheSchema.parse({ ...validCache, _internal: 'x' });
    expect(result).not.toHaveProperty('_internal');
  });
});

describe('cacheCreateSchema', () => {
  const validCreate = {
    key: 'dashboard-1',
    type: 'filter',
    data: '{}',
    expiresIn: '1d',
    assigneeId: 'user-1',
  };

  it('accepts a valid create payload with expiresIn', () => {
    expect(cacheCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('accepts expiresIn omitted (matching legacy @IsOptional())', () => {
    const { expiresIn: _expiresIn, ...rest } = validCreate;
    expect(cacheCreateSchema.parse(rest)).toEqual(rest);
  });

  it('accepts expiresIn explicitly null', () => {
    const result = cacheCreateSchema.parse({ ...validCreate, expiresIn: null });
    expect(result.expiresIn).toBeNull();
  });

  it('accepts data omitted (matching legacy @IsOptional())', () => {
    const { data: _data, ...rest } = validCreate;
    expect(cacheCreateSchema.parse(rest)).toEqual(rest);
  });

  it('rejects a missing assigneeId (e.g. sending { assignee: { id: null } } instead)', () => {
    const { assigneeId: _assigneeId, ...rest } = validCreate;
    expect(cacheCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a null assigneeId', () => {
    expect(
      cacheCreateSchema.safeParse({ ...validCreate, assigneeId: null }).success,
    ).toBe(false);
  });

  it('rejects an empty-string assigneeId', () => {
    expect(
      cacheCreateSchema.safeParse({ ...validCreate, assigneeId: '' }).success,
    ).toBe(false);
  });
});

describe('cacheUpdateSchema', () => {
  it('accepts data + expiresIn', () => {
    const payload = { data: '{ "name": "John Doe" }', expiresIn: null };
    expect(cacheUpdateSchema.parse(payload)).toEqual(payload);
  });

  it('accepts expiresIn omitted (partial update)', () => {
    const payload = { data: '{}' };
    expect(cacheUpdateSchema.parse(payload)).toEqual(payload);
  });

  it('accepts data omitted (e.g. a PATCH that only extends TTL)', () => {
    const payload = { expiresIn: '2d' };
    expect(cacheUpdateSchema.parse(payload)).toEqual(payload);
  });

  it('accepts an empty payload (both fields optional)', () => {
    expect(cacheUpdateSchema.parse({})).toEqual({});
  });

  it('strips fields outside data/expiresIn (e.g. key/type/assigneeId)', () => {
    const result = cacheUpdateSchema.parse({
      data: '{}',
      key: 'ignored',
      type: 'ignored',
      assigneeId: 'ignored',
    });
    expect(result).toEqual({ data: '{}' });
  });
});

describe('cachePaginatedSchema', () => {
  it('accepts a paginated list of cache entities', () => {
    const payload = {
      data: [validCache],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    };
    expect(cachePaginatedSchema.parse(payload)).toEqual(payload);
  });
});
