import { PlainLiteralObject } from '@nestjs/common';

import { SCondition } from '../../request/types/crud-request-query.types';

import { CrudQueryOptionsInterface } from './crud-query-options.interface';

export interface CrudServiceQueryOptionsInterface<T extends PlainLiteralObject>
  extends Omit<CrudQueryOptionsInterface<T>, 'filter'> {
  filter?: SCondition<T>;
}
