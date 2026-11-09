import { type AppContextHost } from '@concepta/nestjs-core';

/**
 * Returns the session context values to set at the start of each
 * transaction on a data source, read from the context the transaction's
 * scope runs under. An `undefined` value, or a name an earlier call
 * returned and this one leaves out, is set to `NULL`.
 */
export type TypeOrmSqlServerSessionContextResolver = (
  ctx: AppContextHost,
  dataSourceKey: string,
) => Readonly<Record<string, string | undefined>>;
