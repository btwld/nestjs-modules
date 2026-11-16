import { type DataSource } from 'typeorm';

import { type AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';

import { type TypeOrmSqlServerSessionContextResolver } from './typeorm-sqlserver-session-context-resolver.type.js';
import { TypeOrmSqlServerTransaction } from './typeorm-sqlserver-transaction.js';

/**
 * Creates transactions on a SQL Server data source. Transactions run
 * concurrently, each on its own connection.
 */
export class TypeOrmSqlServerTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = true;

  /**
   * Every name `sessionContext` has returned. A connection keeps the values
   * of every transaction it ran, so each transaction sets all of them: a
   * name missing from this call is set to `NULL` rather than left holding
   * an earlier caller's value.
   */
  private readonly names = new Set<string>();

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name, as given to `sessionContext`
   * @param sessionContext - Values set for every transaction
   */
  constructor(
    dataSource: DataSource,
    dataSourceKey: string,
    private readonly sessionContext?: TypeOrmSqlServerSessionContextResolver,
  ) {
    super(dataSource, dataSourceKey);
  }

  create(ctx: AppContextHost): TypeOrmSqlServerTransaction {
    if (!this.sessionContext) {
      return new TypeOrmSqlServerTransaction(this.dataSource);
    }
    const values = this.sessionContext(ctx, this.dataSourceKey);
    for (const name of Object.keys(values)) {
      this.names.add(name);
    }
    const all: Record<string, string | undefined> = {};
    for (const name of this.names) {
      all[name] = values[name];
    }
    return new TypeOrmSqlServerTransaction(this.dataSource, all);
  }
}
