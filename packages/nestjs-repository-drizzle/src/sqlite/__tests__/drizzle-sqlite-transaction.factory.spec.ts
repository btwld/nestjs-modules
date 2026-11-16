import { DrizzleError, DrizzleQueryError } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { DrizzleSqliteTransactionFactory } from '../drizzle-sqlite-transaction.factory.js';

describe(DrizzleSqliteTransactionFactory.name, () => {
  const factory = new DrizzleSqliteTransactionFactory(drizzle(':memory:'));

  it('should describe only a commit error SQLite reported', () => {
    const sent = Object.assign(new Error('FOREIGN KEY constraint failed'), {
      name: 'SqliteError',
      code: 'SQLITE_CONSTRAINT_FOREIGNKEY',
    });

    expect(
      factory.describeDatabaseError(
        new DrizzleError({ message: 'commit', cause: sent }),
      ),
    ).toHaveProperty('code', 'SQLITE_CONSTRAINT_FOREIGNKEY');
    expect(
      factory.describeDatabaseError(
        new DrizzleQueryError('commit', [], new TypeError('not a database')),
      ),
    ).toBeUndefined();
  });
});
