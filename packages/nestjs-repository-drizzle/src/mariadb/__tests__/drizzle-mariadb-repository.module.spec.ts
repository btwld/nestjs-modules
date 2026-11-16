import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle } from 'drizzle-orm/pglite';

import { DrizzleUnsupportedDatabaseException } from '../../exceptions/drizzle-unsupported-database.exception.js';
import { DRIZZLE_MARIADB_ADAPTER } from '../drizzle-mariadb-repository.module.js';

describe('DRIZZLE_MARIADB_ADAPTER', () => {
  it('accepts a mysql2 database', () => {
    // A pool connects lazily, so nothing is reached here.
    const db = drizzleMysql('mysql://user:secret@localhost:1/none');

    expect(DRIZZLE_MARIADB_ADAPTER.toClient(db, 'default')).toBe(db);
  });

  it('refuses a database of another kind, naming MariaDB', () => {
    const db = drizzle({ client: new PGlite() });

    expect(() => DRIZZLE_MARIADB_ADAPTER.toClient(db, 'reports')).toThrow(
      DrizzleUnsupportedDatabaseException,
    );
    expect(() => DRIZZLE_MARIADB_ADAPTER.toClient(db, 'reports')).toThrow(
      'The Drizzle connection "reports" is not a "mariadb" database',
    );
  });
});
