import { type AppContextHost } from '@concepta/nestjs-core';

/**
 * Returns the settings to apply at the start of each transaction on a data
 * source, read from the context the transaction's scope runs under. Each
 * entry is applied with `set_config(name, value, true)`, so it lasts until
 * the transaction ends; an `undefined` value is left unset.
 */
export type TypeOrmTransactionSettingsResolver = (
  ctx: AppContextHost,
  dataSourceKey: string,
) => Readonly<Record<string, string | undefined>>;
