import { type DataSource, QueryFailedError } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { TypeOrmSqliteTransactionFactory } from '../typeorm-sqlite-transaction.factory.js';
import { TypeOrmSqliteTransaction } from '../typeorm-sqlite-transaction.js';

describe(TypeOrmSqliteTransactionFactory.name, () => {
  const factory = new TypeOrmSqliteTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  it('should create a SQLite transaction', () => {
    expect(factory.create()).toBeInstanceOf(TypeOrmSqliteTransaction);
  });

  it('should run transactions one at a time on the one connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(false);
  });

  it('should describe only a commit error SQLite reported', () => {
    const sent = Object.assign(new Error('FOREIGN KEY constraint failed'), {
      name: 'SqliteError',
      code: 'SQLITE_CONSTRAINT_FOREIGNKEY',
    });

    expect(
      factory.describeDatabaseError(new QueryFailedError('commit', [], sent)),
    ).toHaveProperty('code', 'SQLITE_CONSTRAINT_FOREIGNKEY');
    expect(
      factory.describeDatabaseError(
        new QueryFailedError('commit', [], new TypeError('not a database')),
      ),
    ).toBeUndefined();
  });
});
