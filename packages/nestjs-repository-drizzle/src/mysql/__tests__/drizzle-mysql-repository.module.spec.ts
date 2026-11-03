import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle } from 'drizzle-orm/pglite';

import { DrizzleUnsupportedDatabaseException } from '../../exceptions/drizzle-unsupported-database.exception.js';
import { toDrizzleMysqlClient } from '../drizzle-mysql-repository.module.js';

describe(toDrizzleMysqlClient.name, () => {
  it('accepts a mysql2 database', () => {
    // A pool connects lazily, so nothing is reached here.
    const db = drizzleMysql('mysql://user:secret@localhost:1/none');

    expect(toDrizzleMysqlClient(db, 'default')).toBe(db);
  });

  it('refuses a database of another kind, naming its connection', () => {
    const db = drizzle({ client: new PGlite() });

    expect(() => toDrizzleMysqlClient(db, 'reports')).toThrow(
      DrizzleUnsupportedDatabaseException,
    );
    expect(() => toDrizzleMysqlClient(db, 'reports')).toThrow(
      'The Drizzle connection "reports" is not a "mysql" database',
    );
  });
});
