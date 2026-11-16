import { type AppContextHost } from '@concepta/nestjs-core';

/**
 * Returns the application context values to set at the start of each
 * transaction on a data source, read from the context the transaction's
 * scope runs under. An `undefined` value is left unset.
 */
export type TypeOrmOracleApplicationContextResolver = (
  ctx: AppContextHost,
  dataSourceKey: string,
) => Readonly<Record<string, string | undefined>>;
