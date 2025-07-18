import { SCondition } from '../../request/types/crud-request-query.types';

import { CrudQueryOptionsInterface } from './crud-query-options.interface';

export interface CrudServiceQueryOptionsInterface
  extends Omit<CrudQueryOptionsInterface, 'filter'> {
  filter?: SCondition;
}
