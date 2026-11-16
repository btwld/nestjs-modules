import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/pglite';

import { DrizzleUnsupportedDatabaseException } from '../../exceptions/drizzle-unsupported-database.exception.js';
import { toDrizzleSqliteClient } from '../drizzle-sqlite-repository.module.js';

describe(toDrizzleSqliteClient.name, () => {
  it('accepts a better-sqlite3 database', () => {
    const db = drizzleSqlite(':memory:');

    expect(toDrizzleSqliteClient(db, 'default')).toBe(db);
  });

  it('refuses a database of another kind, naming its connection', () => {
    const db = drizzle({ client: new PGlite() });

    expect(() => toDrizzleSqliteClient(db, 'reports')).toThrow(
      DrizzleUnsupportedDatabaseException,
    );
    expect(() => toDrizzleSqliteClient(db, 'reports')).toThrow(
      'The Drizzle connection "reports" is not a "sqlite" database',
    );
  });
});
