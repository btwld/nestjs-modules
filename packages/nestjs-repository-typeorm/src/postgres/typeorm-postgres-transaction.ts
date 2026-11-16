import { type DataSource, type QueryRunner } from 'typeorm';

import { TypeOrmTransaction } from '../transaction/typeorm-transaction.js';

/**
 * A transaction on a Postgres data source.
 */
export class TypeOrmPostgresTransaction extends TypeOrmTransaction {
  /**
   * @param dataSource - The data source to run on
   * @param settings - Applied with `set_config(name, value, true)` once the
   *   transaction has begun, in order; an `undefined` value is skipped
   */
  constructor(
    dataSource: DataSource,
    private readonly settings: Readonly<
      Record<string, string | undefined>
    > = {},
  ) {
    super(dataSource);
  }

  protected override async afterBegin(queryRunner: QueryRunner): Promise<void> {
    for (const [name, value] of Object.entries(this.settings)) {
      if (value !== undefined) {
        await queryRunner.query('select set_config($1, $2, true)', [
          name,
          value,
        ]);
      }
    }
  }
}
