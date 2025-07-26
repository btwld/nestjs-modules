import { PlainLiteralObject, ValidationPipeOptions } from '@nestjs/common';

import { CrudModelOptionsInterface } from './crud-model-options.interface';
import { CrudParamsOptionsInterface } from './crud-params-options.interface';
import { CrudQueryOptionsInterface } from './crud-query-options.interface';
import { CrudRoutesOptionsInterface } from './crud-routes-options.interface';

export interface CrudOptionsInterface<T extends PlainLiteralObject> {
  model: CrudModelOptionsInterface;
  query?: CrudQueryOptionsInterface<T>;
  routes?: CrudRoutesOptionsInterface;
  params?: CrudParamsOptionsInterface<T>;
  validation?: ValidationPipeOptions | false;
}
