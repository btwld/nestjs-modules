import { type TypeOrmOracleApplicationContextResolver } from './typeorm-oracle-application-context-resolver.type.js';

/**
 * How the Oracle adapter sets an application context, the values a Virtual
 * Private Database policy reads with `SYS_CONTEXT`.
 */
export interface TypeOrmOracleApplicationContextInterface {
  /**
   * The procedure of the context's trusted package that sets one value,
   * called as `procedure(name, value)`, for example `'app_ctx_pkg.set_value'`.
   * It is called with a `NULL` value to clear each one.
   */
  procedure: string;

  /** The values to set for each transaction. */
  values: TypeOrmOracleApplicationContextResolver;
}
