import { type AppContextHost } from '@concepta/nestjs-core';

import { type DrizzlePostgresTransactionSettings } from './drizzle-postgres-transaction-settings.type.js';

/**
 * Returns the settings to apply at the start of each transaction on a
 * connection, read from the context the transaction runs under. Each entry
 * is applied with `set_config(name, value, true)`, so it lasts until the
 * transaction ends; an `undefined` value is left unset.
 */
export type DrizzlePostgresTransactionSettingsResolver = (
  ctx: AppContextHost,
  connection: string,
) => DrizzlePostgresTransactionSettings;
