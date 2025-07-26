import { CrudReadAll } from './crud-read-all.decorator';

/**
 * CRUD Get Many route decorator (alias for Read All)
 */
export const CrudGetMany = (...args: Parameters<typeof CrudReadAll>) =>
  CrudReadAll(...args);
