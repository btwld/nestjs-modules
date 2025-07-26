import { CrudReadOne } from './crud-read-one.decorator';

/**
 * CRUD Get One route decorator (alias for Read One)
 */
export const CrudGetOne = (...args: Parameters<typeof CrudReadOne>) =>
  CrudReadOne(...args);
