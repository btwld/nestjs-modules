import { type DataSource, QueryFailedError } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { TypeOrmPostgresTransactionFactory } from '../typeorm-postgres-transaction.factory.js';

describe(TypeOrmPostgresTransactionFactory.name, () => {
  const factory = new TypeOrmPostgresTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  it('should describe only a commit error the server sent', () => {
    const sent = Object.assign(new Error('refused'), {
      code: '23503',
      severity: 'ERROR',
    });
    const timedOut = new Error('Query read timeout');

    expect(
      factory.describeDatabaseError(new QueryFailedError('commit', [], sent)),
    ).toHaveProperty('code', '23503');
    expect(
      factory.describeDatabaseError(
        new QueryFailedError('commit', [], timedOut),
      ),
    ).toBeUndefined();
  });
});
