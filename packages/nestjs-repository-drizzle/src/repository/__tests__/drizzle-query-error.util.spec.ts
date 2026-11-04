import { DrizzleQueryError } from 'drizzle-orm';

import { isDrizzleQueryError } from '../drizzle-query-error.util.js';

/** The same error from drizzle-orm's other build: another class. */
class OtherBuildDrizzleQueryError extends Error {
  constructor(
    public query: string,
    public params: unknown[],
  ) {
    super(`Failed query: ${query}`);
  }
}

describe(isDrizzleQueryError.name, () => {
  it.each([
    ['this build', new DrizzleQueryError('select 1', [], new Error('x'))],
    ['the other build', new OtherBuildDrizzleQueryError('select 1', [])],
  ])('recognises a failed query from %s', (_, error) => {
    expect(isDrizzleQueryError(error)).toBe(true);
  });

  it.each([
    ['a plain error', new Error('select 1')],
    ['an object of the same shape', { query: 'select 1', params: [] }],
  ])('refuses %s', (_, error) => {
    expect(isDrizzleQueryError(error)).toBe(false);
  });
});
