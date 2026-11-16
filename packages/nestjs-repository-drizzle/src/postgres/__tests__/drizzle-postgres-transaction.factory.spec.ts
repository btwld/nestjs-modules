import { PGlite } from '@electric-sql/pglite';
import { DrizzleQueryError } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';

import { DrizzlePostgresTransactionFactory } from '../drizzle-postgres-transaction.factory.js';

describe(DrizzlePostgresTransactionFactory.name, () => {
  const factory = new DrizzlePostgresTransactionFactory(
    drizzle({ client: new PGlite() }),
    'default',
  );
  const sent = Object.assign(new Error('refused'), {
    code: '23503',
    severity: 'ERROR',
  });

  it('should describe a commit error the server sent, thrown as is or under a query', () => {
    expect(factory.describeDatabaseError(sent)).toHaveProperty('code', '23503');
    expect(
      factory.describeDatabaseError(new DrizzleQueryError('commit', [], sent)),
    ).toHaveProperty('code', '23503');
  });

  it('should not describe a commit error the client raised', () => {
    const timedOut = new Error('Query read timeout');

    expect(factory.describeDatabaseError(timedOut)).toBeUndefined();
    expect(
      factory.describeDatabaseError(
        new DrizzleQueryError('commit', [], timedOut),
      ),
    ).toBeUndefined();
  });
});
