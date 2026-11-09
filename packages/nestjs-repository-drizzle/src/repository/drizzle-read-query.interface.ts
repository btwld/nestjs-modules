import { type SQL } from 'drizzle-orm';

/**
 * A read as an adapter builds it: the columns it selects, by property key
 * (every own column when empty), which rows, in what order, and which page.
 */
export interface DrizzleReadQueryInterface {
  select: string[];
  where?: SQL;
  order: SQL[];
  take?: number;
  skip?: number;
  /** Lock the rows read until the transaction ends. */
  lock?: boolean;
}
