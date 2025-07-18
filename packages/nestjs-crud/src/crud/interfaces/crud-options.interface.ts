import { ValidationPipeOptions } from '@nestjs/common';

import { CrudModelOptionsInterface } from './crud-model-options.interface';
import { CrudParamsOptionsInterface } from './crud-params-options.interface';
import { CrudQueryOptionsInterface } from './crud-query-options.interface';
import { CrudRoutesOptionsInterface } from './crud-routes-options.interface';

export interface CrudOptionsInterface {
  model: CrudModelOptionsInterface;
  query?: CrudQueryOptionsInterface;
  routes?: CrudRoutesOptionsInterface;
  params?: CrudParamsOptionsInterface;
  validation?: ValidationPipeOptions | false;
}
