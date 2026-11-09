import { type DataSource, type QueryRunner } from 'typeorm';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { TypeOrmSqlServerTransaction } from '../typeorm-sqlserver-transaction.js';

describe(TypeOrmSqlServerTransaction.name, () => {
  let dataSource: DeepMockProxy<DataSource>;
  let queryRunner: DeepMockProxy<QueryRunner>;
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;
    let active = false;
    queryRunner = mockDeep<QueryRunner>();
    Object.defineProperty(queryRunner, 'isTransactionActive', {
      get: () => active,
    });
    queryRunner.startTransaction.mockImplementation(async () => {
      calls.push('begin');
      active = true;
    });
    queryRunner.commitTransaction.mockImplementation(async () => {
      calls.push('commit');
      active = false;
    });
    queryRunner.rollbackTransaction.mockImplementation(async () => {
      calls.push('rollback');
      active = false;
    });
    queryRunner.release.mockImplementation(async () => {
      calls.push('release');
    });
    queryRunner.query.mockImplementation(async () => {
      calls.push('set');
    });

    dataSource = mockDeep<DataSource>();
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
  });

  it('should set every value, undefined as NULL, then the transaction id, in one batch after BEGIN', async () => {
    await new TypeOrmSqlServerTransaction(dataSource, {
      tenant_id: 't-1',
      user_id: undefined,
    }).start();

    expect(calls).toEqual(['begin', 'set']);
    expect(queryRunner.query).toHaveBeenCalledWith(
      [
        'EXEC sp_set_session_context @0, @1;',
        'EXEC sp_set_session_context @2, @3;',
        'DECLARE @transaction_id bigint = CURRENT_TRANSACTION_ID();',
        "EXEC sp_set_session_context N'rockets.transaction_id', @transaction_id;",
      ].join('\n'),
      ['tenant_id', 't-1', 'user_id', null],
    );
  });

  it('should set the transaction id when there are no values', async () => {
    await new TypeOrmSqlServerTransaction(dataSource, {}).start();

    expect(queryRunner.query).toHaveBeenCalledWith(
      [
        'DECLARE @transaction_id bigint = CURRENT_TRANSACTION_ID();',
        "EXEC sp_set_session_context N'rockets.transaction_id', @transaction_id;",
      ].join('\n'),
      [],
    );
  });

  it('should run no statements of its own without a session context', async () => {
    const tx = new TypeOrmSqlServerTransaction(dataSource);
    await tx.start();
    await tx.commit();

    expect(calls).toEqual(['begin', 'commit', 'release']);
  });

  it('should roll back and fail to start when setting the session context fails', async () => {
    queryRunner.query.mockRejectedValue(new Error('refused'));

    await expect(
      new TypeOrmSqlServerTransaction(dataSource, { tenant_id: 't-1' }).start(),
    ).rejects.toThrow('refused');

    expect(calls).toEqual(['begin', 'rollback', 'release']);
  });
});
