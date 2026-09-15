import { z } from 'zod';

import { withEmptyBodyGuard } from '../crud-empty-body-guard.util.js';

describe('withEmptyBodyGuard', () => {
  const optionalSchema = z.object({
    name: z.string().optional(),
  });

  it('allows an empty object by default', () => {
    const schema = withEmptyBodyGuard(optionalSchema);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('allows an empty object when allowEmptyBody is true', () => {
    const schema = withEmptyBodyGuard(optionalSchema, true);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('rejects an empty object when allowEmptyBody is false', () => {
    const schema = withEmptyBodyGuard(optionalSchema, false);
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toEqual(
        'Body must not be empty.',
      );
    }
  });

  it('accepts a non-empty object when allowEmptyBody is false', () => {
    const schema = withEmptyBodyGuard(optionalSchema, false);
    expect(schema.safeParse({ name: 'Test' }).success).toBe(true);
  });

  it('never rejects as empty when the schema fills fields via .default()', () => {
    const defaultedSchema = z.object({
      name: z.string().default(''),
    });
    const schema = withEmptyBodyGuard(defaultedSchema, false);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: '' });
    }
  });
});
