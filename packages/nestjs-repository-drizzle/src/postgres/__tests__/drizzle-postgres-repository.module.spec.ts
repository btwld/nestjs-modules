import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/pglite';
import { drizzle as drizzleSqliteProxy } from 'drizzle-orm/sqlite-proxy';
import pg from 'pg';

import { DrizzleSingleConnectionException } from '../../exceptions/drizzle-single-connection.exception.js';
import { DrizzleUnsupportedDatabaseException } from '../../exceptions/drizzle-unsupported-database.exception.js';
import { toDrizzlePostgresClient } from '../drizzle-postgres-repository.module.js';

describe(toDrizzlePostgresClient.name, () => {
  it('accepts a Postgres database', () => {
    const db = drizzle({ client: new PGlite() });

    expect(toDrizzlePostgresClient(db, 'default')).toBe(db);
  });

  it('accepts a node-postgres pool', () => {
    // A pool connects lazily, so nothing is reached here.
    const db = drizzleNodePg({ client: new pg.Pool() });

    expect(toDrizzlePostgresClient(db, 'default')).toBe(db);
  });

  it('refuses a single node-postgres connection, naming its connection', () => {
    // Not connected: a client connects only when asked.
    const db = drizzleNodePg({ client: new pg.Client() });

    expect(() => toDrizzlePostgresClient(db, 'reports')).toThrow(
      DrizzleSingleConnectionException,
    );
    expect(() => toDrizzlePostgresClient(db, 'reports')).toThrow(
      'The Drizzle connection "reports" is a single connection',
    );
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
