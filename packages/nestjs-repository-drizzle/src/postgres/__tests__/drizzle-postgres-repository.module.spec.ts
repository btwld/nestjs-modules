import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { drizzle as drizzleSqliteProxy } from 'drizzle-orm/sqlite-proxy';

import { DrizzleUnsupportedDatabaseException } from '../../exceptions/drizzle-unsupported-database.exception.js';
import { toDrizzlePostgresClient } from '../drizzle-postgres-repository.module.js';

describe(toDrizzlePostgresClient.name, () => {
  it('accepts a Postgres database', () => {
    const db = drizzle({ client: new PGlite() });

    expect(toDrizzlePostgresClient(db, 'default')).toBe(db);
  });

  it('refuses a database of another kind, naming its connection', () => {
    const db = drizzleSqliteProxy(async () => ({ rows: [] }));

    expect(() => toDrizzlePostgresClient(db, 'reports')).toThrow(
      DrizzleUnsupportedDatabaseException,
    );
    expect(() => toDrizzlePostgresClient(db, 'reports')).toThrow(
      'The Drizzle connection "reports" is not a "postgres" database',
    );
  });
});
