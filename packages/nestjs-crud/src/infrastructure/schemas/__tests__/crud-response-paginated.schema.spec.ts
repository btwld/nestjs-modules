import { z } from 'zod';

import { paginatedSchema } from '../crud-response-paginated.schema.js';

describe(paginatedSchema, () => {
  const itemSchema = z.object({ id: z.string(), name: z.string() });
  const schema = paginatedSchema(itemSchema);

  it('accepts a paginated shape with an array of the item schema', () => {
    const result = schema.parse({
      data: [{ id: '1', name: 'a' }],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    });

    expect(result).toEqual({
      data: [{ id: '1', name: 'a' }],
      limit: 10,
      count: 1,
      total: 1,
      page: 1,
      pageCount: 1,
    });
  });

  it('strips unknown keys, including metrics (not part of the schema, matching the legacy DTO)', () => {
    const result = schema.parse({
      data: [],
      limit: 0,
      count: 0,
      total: 0,
      page: 0,
      pageCount: 0,
      metrics: { totalFetched: 1, totalValid: 1, fetchCalls: 1, duration: 1 },
    });

    expect(result).not.toHaveProperty('metrics');
  });

  it('rejects an item that does not match the item schema', () => {
    const result = schema.safeParse({
      data: [{ id: 1, name: 'a' }],
      limit: 0,
      count: 0,
      total: 0,
      page: 0,
      pageCount: 0,
    });

    expect(result.success).toBe(false);
  });
});
