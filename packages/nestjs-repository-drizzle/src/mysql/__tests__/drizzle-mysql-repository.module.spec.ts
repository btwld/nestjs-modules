import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle } from 'drizzle-orm/pglite';
import mysql from 'mysql2';

import { DrizzleSingleConnectionException } from '../../exceptions/drizzle-single-connection.exception.js';
import { DrizzleUnsupportedDatabaseException } from '../../exceptions/drizzle-unsupported-database.exception.js';
import { toDrizzleMysqlClient } from '../drizzle-mysql-repository.module.js';

describe(toDrizzleMysqlClient.name, () => {
  it('accepts a mysql2 database', () => {
    // A pool connects lazily, so nothing is reached here.
    const db = drizzleMysql('mysql://user:secret@localhost:1/none');

    expect(toDrizzleMysqlClient(db, 'default')).toBe(db);
  });

  it('refuses a single mysql2 connection, naming its connection', async () => {
    // A connection connects at once; nothing listens on the port.
    const connection = mysql.createConnection('mysql://u:p@127.0.0.1:1/none');
    connection.on('error', () => undefined);
    const db = drizzleMysql({ client: connection });

    try {
      expect(() => toDrizzleMysqlClient(db, 'reports')).toThrow(
        DrizzleSingleConnectionException,
      );
      expect(() => toDrizzleMysqlClient(db, 'reports')).toThrow(
        'The Drizzle connection "reports" is a single connection',
      );
    } finally {
      connection.destroy();
    }
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
