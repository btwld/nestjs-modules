import { z } from 'zod';

import { createBatchSchema } from '../crud-create-batch.schema.js';

describe(createBatchSchema, () => {
  const itemSchema = z.object({ id: z.string(), name: z.string() });
  const schema = createBatchSchema(itemSchema);

  it('accepts a bulk array of the item schema', () => {
    const result = schema.parse({ bulk: [{ id: '1', name: 'a' }] });

    expect(result).toEqual({ bulk: [{ id: '1', name: 'a' }] });
  });

  it('rejects an empty bulk array (matching legacy @ArrayNotEmpty())', () => {
    const result = schema.safeParse({ bulk: [] });

    expect(result.success).toBe(false);
  });

  it('rejects an item that does not match the item schema', () => {
    const result = schema.safeParse({ bulk: [{ id: 1, name: 'a' }] });

    expect(result.success).toBe(false);
  });
});
