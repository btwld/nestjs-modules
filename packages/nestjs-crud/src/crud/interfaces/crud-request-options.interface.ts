import { PlainLiteralObject } from '@nestjs/common';

import { CrudParamsOptionsInterface } from './crud-params-options.interface';
import { CrudQueryOptionsInterface } from './crud-query-options.interface';
import { CrudRoutesOptionsInterface } from './crud-routes-options.interface';

export interface CrudRequestOptionsInterface<T extends PlainLiteralObject> {
  query?: CrudQueryOptionsInterface<T>;
  routes?: CrudRoutesOptionsInterface;
  params?: CrudParamsOptionsInterface<T>;
}
