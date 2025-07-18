import { CrudParamsOptionsInterface } from './crud-params-options.interface';
import { CrudQueryOptionsInterface } from './crud-query-options.interface';
import { CrudRoutesOptionsInterface } from './crud-routes-options.interface';

export interface CrudRequestOptionsInterface {
  query?: CrudQueryOptionsInterface;
  routes?: CrudRoutesOptionsInterface;
  params?: CrudParamsOptionsInterface;
}
