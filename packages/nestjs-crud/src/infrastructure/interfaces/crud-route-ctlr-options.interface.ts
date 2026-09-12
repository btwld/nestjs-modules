import { type PlainLiteralObject, type Type } from '@nestjs/common';
import {
  type ApiBodyOptions,
  type ApiOperationOptions,
  type ApiParamOptions,
  type ApiQueryOptions,
  type ApiResponseOptions,
} from '@nestjs/swagger';

import { type CrudCommandHandlerInterface } from '../../application/commands/interfaces/crud-command-handler.interface.js';
import { type CrudCommandInterface } from '../../application/commands/interfaces/crud-command.interface.js';
import { type CrudQueryHandlerInterface } from '../../application/queries/interfaces/crud-query-handler.interface.js';
import { type CrudQueryInterface } from '../../application/queries/interfaces/crud-query.interface.js';
import { type CrudRequestConfig } from '../request/interfaces/crud-request-config.interface.js';
import { type CrudResponseConfig } from '../request/interfaces/crud-response-config.interface.js';

import { type CrudTransactionalInterface } from './crud-transactional.interface.js';

interface CrudRouteCtlrOptionsInterface<T extends PlainLiteralObject> {
  path?: string | string[];
  /**
   * Request configuration overrides for this route.
   */
  request?: CrudRequestConfig<T>;

  /**
   * Response configuration overrides for this route.
   */
  response?: CrudResponseConfig;

  api?: {
    operation?: ApiOperationOptions;
    query?: ApiQueryOptions[];
    params?: ApiParamOptions;
    /**
     * Only read by the write operations that accept a body — Create,
     * CreateBatch, Update, Replace. Setting this on a read/delete operation
     * type-checks but has no effect.
     */
    body?: ApiBodyOptions;
    response?: ApiResponseOptions;
  };
}

export interface CrudRouteQueryOptionsInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
>
  extends CrudRouteCtlrOptionsInterface<T>, CrudTransactionalInterface {
  query?: Type<CrudQueryInterface<T>>;
  queryHandler?: Type<CrudQueryHandlerInterface<T>>;
}

export interface CrudRouteCommandOptionsInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
>
  extends CrudRouteCtlrOptionsInterface<T>, CrudTransactionalInterface {
  command?: Type<CrudCommandInterface<T>>;
  commandHandler?: Type<CrudCommandHandlerInterface<T>>;
}
