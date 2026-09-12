import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudParamsOptionsInterface } from '../../interfaces/crud-params-options.interface.js';
import { type CrudQueryOptionsInterface } from '../../request/interfaces/crud-query-options.interface.js';

import { type CrudRouteOptionsInterface } from './crud-route-options.interface.js';

export interface CrudContextOptionsInterface<T extends PlainLiteralObject> {
  query?: CrudQueryOptionsInterface<T>;
  route?: CrudRouteOptionsInterface<T>;
  params?: CrudParamsOptionsInterface<T>;
}
