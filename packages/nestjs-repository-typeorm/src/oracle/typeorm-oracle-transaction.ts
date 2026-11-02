import { type DataSource, type QueryRunner } from 'typeorm';

import { Logger } from '@nestjs/common';

import { TypeOrmTransaction } from '../transaction/typeorm-transaction.js';

/**
 * A transaction on an Oracle data source.
 *
 * Application context values last as long as the session, which outlives
 * the transaction on a pooled connection, so every value set at the start
 * is cleared before the connection goes back to the pool.
 */
export class TypeOrmOracleTransaction extends TypeOrmTransaction {
  /** The names set on this transaction's connection, in order. */
  private readonly applied: string[] = [];

  /**
   * @param dataSource - The data source to run on
   * @param procedure - The application context's procedure, called as
   *   `procedure(name, value)`; without one, nothing is set
   * @param values - Set once the transaction has begun, in order; an
   *   `undefined` value is skipped
   */
  constructor(
    dataSource: DataSource,
    private readonly procedure?: string,
    private readonly values: Readonly<Record<string, string | undefined>> = {},
  ) {
    super(dataSource);
  }

  protected override async afterBegin(queryRunner: QueryRunner): Promise<void> {
    if (!this.procedure) {
      return;
    }
    for (const [name, value] of Object.entries(this.values)) {
      if (value !== undefined) {
        // Recorded first: a failed call may still have set the value.
        this.applied.push(name);
        await this.setValue(queryRunner, this.procedure, name, value);
      }
    }
  }

  /**
   * Clears every value set, then releases the connection. A value that
   * can't be cleared is logged and the connection released anyway: until
   * the next transaction on it sets its own values, it still holds that one.
   */
  protected override async release(queryRunner: QueryRunner): Promise<void> {
    if (this.procedure) {
      for (const name of this.applied) {
        try {
          await this.setValue(queryRunner, this.procedure, name, null);
        } catch (error) {
          Logger.error(
            `Failed to clear application context value "${name}" before releasing its connection: ${error}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }
    await super.release(queryRunner);
  }

  private async setValue(
    queryRunner: QueryRunner,
    procedure: string,
    name: string,
    value: string | null,
  ): Promise<void> {
    await queryRunner.query(`BEGIN ${procedure}(:1, :2); END;`, [name, value]);
  }
}
