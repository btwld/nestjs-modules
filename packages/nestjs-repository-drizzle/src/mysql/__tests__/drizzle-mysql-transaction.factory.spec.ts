import { DrizzleQueryError } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';

import { DrizzleMysqlTransactionFactory } from '../drizzle-mysql-transaction.factory.js';

describe(DrizzleMysqlTransactionFactory.name, () => {
  const factory = new DrizzleMysqlTransactionFactory(
    // A pool that never connects: the factory only describes errors here.
    drizzle('mysql://user:secret@localhost:1/none'),
    'mysql',
  );

  it('should describe only a commit error the server sent', () => {
    const sent = Object.assign(new Error('refused'), {
      code: 'ER_LOCK_DEADLOCK',
      sqlState: '40001',
    });
    const lost = Object.assign(new Error('lost'), { code: 'ECONNRESET' });

    expect(
      factory.describeDatabaseError(new DrizzleQueryError('commit', [], sent)),
    ).toEqual({
      database: 'mysql',
      code: 'ER_LOCK_DEADLOCK',
      message: 'refused',
    });
    expect(
      factory.describeDatabaseError(new DrizzleQueryError('commit', [], lost)),
    ).toBeUndefined();
  });
});
