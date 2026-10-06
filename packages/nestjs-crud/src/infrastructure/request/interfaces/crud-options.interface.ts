import {
  type PlainLiteralObject,
  type StandardSchemaValidationPipeOptions,
} from '@nestjs/common';

import { type CrudParamsOptionsInterface } from '../../interfaces/crud-params-options.interface.js';

import { type CrudQueryOptionsInterface } from './crud-query-options.interface.js';

export interface CrudOptionsInterface<T extends PlainLiteralObject> {
  query?: CrudQueryOptionsInterface<T>;
  params?: CrudParamsOptionsInterface<T>;
  /**
   * Options merged into the `StandardSchemaValidationPipe` used to
   * validate a `@CrudBody()` schema — lets callers configure pipe
   * behavior (e.g. `exceptionFactory`, `errorHttpStatusCode`) via plain
   * data instead of subclassing. `false` disables validation for the
   * body (it is still bound, just unvalidated).
   */
  validation?: StandardSchemaValidationPipeOptions | false;
}
