import { type DataSource, type QueryRunner } from 'typeorm';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { Logger } from '@nestjs/common';

import { TypeOrmOracleTransaction } from '../typeorm-oracle-transaction.js';

const PROCEDURE = 'app_ctx_pkg.set_value';
const CALL = `BEGIN ${PROCEDURE}(:1, :2); END;`;

describe(TypeOrmOracleTransaction.name, () => {
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
    queryRunner.query.mockImplementation(async (_sql, params) => {
      calls.push(Array.isArray(params) ? params.join('=') : '');
    });

    dataSource = mockDeep<DataSource>();
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    vi.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set each value after BEGIN, in order, skipping undefined values', async () => {
    await new TypeOrmOracleTransaction(dataSource, PROCEDURE, {
      tenant_id: 't-1',
      user_id: undefined,
      region: 'eu',
    }).start();

    expect(calls).toEqual(['begin', 'tenant_id=t-1', 'region=eu']);
    expect(queryRunner.query).toHaveBeenCalledWith(CALL, ['tenant_id', 't-1']);
  });

  it('should clear every value set before releasing the connection', async () => {
    const tx = new TypeOrmOracleTransaction(dataSource, PROCEDURE, {
      tenant_id: 't-1',
      user_id: undefined,
      region: 'eu',
    });
    await tx.start();
    calls.length = 0;

    await tx.commit();

    expect(calls).toEqual(['commit', 'tenant_id=', 'region=', 'release']);
    expect(queryRunner.query).toHaveBeenCalledWith(CALL, ['tenant_id', null]);
  });

  it('should run no statements of its own without a procedure', async () => {
    const tx = new TypeOrmOracleTransaction(dataSource);
    await tx.start();
    await tx.rollback();

    expect(queryRunner.query).not.toHaveBeenCalled();
    expect(calls).toEqual(['begin', 'rollback', 'release']);
  });

  it('should log a value it cannot clear, clear the rest and still release the connection', async () => {
    const tx = new TypeOrmOracleTransaction(dataSource, PROCEDURE, {
      region: 'eu',
      tenant_id: 't-1',
    });
    await tx.start();
    queryRunner.query.mockRejectedValueOnce(new Error('ORA-04068'));
    calls.length = 0;

    await tx.commit();

    expect(calls).toEqual(['commit', 'tenant_id=', 'release']);
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });

  it('should roll back, clear what it set and release when a value cannot be set', async () => {
    const setError = new Error('ORA-06550');
    queryRunner.query
      .mockImplementationOnce(async () => {
        calls.push('tenant_id=t-1');
      })
      .mockRejectedValueOnce(setError);
    const tx = new TypeOrmOracleTransaction(dataSource, PROCEDURE, {
      tenant_id: 't-1',
      region: 'eu',
    });

    await expect(tx.start()).rejects.toBe(setError);

    // `region` is cleared too: a failed call may still have set it.
    expect(calls).toEqual([
      'begin',
      'tenant_id=t-1',
      'rollback',
      'tenant_id=',
      'region=',
      'release',
    ]);
    expect(tx.isActive).toBe(false);
  });
});
