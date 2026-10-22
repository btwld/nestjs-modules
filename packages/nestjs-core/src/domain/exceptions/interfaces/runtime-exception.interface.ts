import { type HttpExceptionBody, type HttpStatus } from '@nestjs/common';

import {
  type RuntimeExceptionContext,
  type RuntimeExceptionFault,
} from '../exception.types.js';
import { type ExceptionInterface } from '../interfaces/exception.interface.js';

export interface RuntimeExceptionInterface extends ExceptionInterface {
  /**
   * The HTTP status code this exception renders with. Always set (defaults
   * to `HttpStatus.INTERNAL_SERVER_ERROR` — see `getStatus()`).
   */
  httpStatus: HttpStatus;

  /**
   * Who is at fault for this exception. Always set (defaults to
   * `'internal'`). Never rendered on the wire — see
   * {@link RuntimeExceptionFault}.
   */
  fault: RuntimeExceptionFault;

  /**
   * If set, this message will be used on responses instead of `message`.
   *
   * Use this when the main message might expose
   */
  safeMessage?: string;

  /**
   * Additional context
   */
  context: RuntimeExceptionContext;

  /**
   * The HTTP status code (native `HttpException` accessor).
   */
  getStatus(): number;

  /**
   * The response body rendered by Nest's exception layer.
   */
  getResponse(): HttpExceptionBody;
}
