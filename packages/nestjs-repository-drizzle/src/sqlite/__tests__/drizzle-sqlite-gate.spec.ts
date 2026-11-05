import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { gateOf } from '../drizzle-sqlite-gate.js';

describe(gateOf, () => {
  it('gives two Drizzle databases on one connection the same gate', () => {
    const client = new Database(':memory:');

    expect(gateOf(drizzle({ client }))).toBe(gateOf(drizzle({ client })));
  });

  it('gives databases on different connections different gates', () => {
    expect(gateOf(drizzle(':memory:'))).not.toBe(gateOf(drizzle(':memory:')));
  });
});
