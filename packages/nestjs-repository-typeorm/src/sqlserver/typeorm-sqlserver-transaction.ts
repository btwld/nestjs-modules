import { type DataSource, type QueryRunner } from 'typeorm';

import { TypeOrmTransaction } from '../transaction/typeorm-transaction.js';

import { TYPEORM_SQLSERVER_TRANSACTION_ID_KEY } from './typeorm-sqlserver.constants.js';

/**
 * A transaction on a SQL Server data source.
 *
 * Session context values last as long as the session, and the client hands
 * the connection back to the pool when the transaction ends, so they can't
 * be cleared reliably. Instead, the transaction's id is set beside them:
 * a policy that compares it with `CURRENT_TRANSACTION_ID()` matches nothing
 * the values left behind.
 */
export class TypeOrmSqlServerTransaction extends TypeOrmTransaction {
  /**
   * @param dataSource - The data source to run on
   * @param sessionContext - Set once the transaction has begun; an
   *   `undefined` value is set to `NULL`. Without it, nothing is set
   */
  constructor(
    dataSource: DataSource,
    private readonly sessionContext?: Readonly<
      Record<string, string | undefined>
    >,
  ) {
    super(dataSource);
  }

  protected override async afterBegin(queryRunner: QueryRunner): Promise<void> {
    if (!this.sessionContext) {
      return;
    }
    const statements: string[] = [];
    const parameters: (string | null)[] = [];
    for (const [name, value] of Object.entries(this.sessionContext)) {
      statements.push(
        `EXEC sp_set_session_context @${parameters.length}, @${parameters.length + 1};`,
      );
      parameters.push(name, value ?? null);
    }
    // A failure fails start(), which ends the transaction, so whatever the
    // batch did set matches nothing afterwards.
    statements.push(
      'DECLARE @transaction_id bigint = CURRENT_TRANSACTION_ID();',
      `EXEC sp_set_session_context N'${TYPEORM_SQLSERVER_TRANSACTION_ID_KEY}', @transaction_id;`,
    );
    await queryRunner.query(statements.join('\n'), parameters);
  }
}
