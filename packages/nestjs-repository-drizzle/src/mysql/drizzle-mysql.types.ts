import { type MySqlDatabase } from 'drizzle-orm/mysql-core';
import {
  type MySql2PreparedQueryHKT,
  type MySql2QueryResultHKT,
} from 'drizzle-orm/mysql2';

/**
 * A Drizzle database the MySQL adapter reads and writes through: a database
 * created by the mysql2 entry point, with or without a schema, or a
 * transaction on one.
 */
export type DrizzleMysqlClient = MySqlDatabase<
  MySql2QueryResultHKT,
  MySql2PreparedQueryHKT,
  Record<string, unknown>
>;
