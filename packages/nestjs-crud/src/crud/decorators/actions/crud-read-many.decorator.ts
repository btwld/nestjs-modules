import { CrudReadAll } from './crud-read-all.decorator';

/**
 * CRUD Read Many route decorator (alias for Read All)
 */
export const CrudReadMany = (...args: Parameters<typeof CrudReadAll>) =>
  CrudReadAll(...args);
