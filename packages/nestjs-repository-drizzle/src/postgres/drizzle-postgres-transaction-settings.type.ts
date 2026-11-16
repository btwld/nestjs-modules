/**
 * Settings for one transaction, by name: each applied with
 * `set_config(name, value, true)`; an `undefined` value is left unset.
 */
export type DrizzlePostgresTransactionSettings = Readonly<
  Record<string, string | undefined>
>;
