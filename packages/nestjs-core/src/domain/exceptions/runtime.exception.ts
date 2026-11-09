import { STATUS_CODES } from 'http';
import { format } from 'util';

import {
  HttpException,
  HttpStatus,
  type HttpExceptionBody,
} from '@nestjs/common';

import { mapNonErrorToException } from '../../infrastructure/utils/map-non-error-to-exception.util.js';

import {
  type RuntimeExceptionContext,
  type RuntimeExceptionFault,
} from './exception.types.js';
import { type RuntimeExceptionOptions } from './interfaces/runtime-exception-options.interface.js';
import { type RuntimeExceptionInterface } from './interfaces/runtime-exception.interface.js';

/**
 * Public body message used for 5xx responses when no `safeMessage` was
 * provided — mirrors Nest's own default so a suppressed message reads
 * identically to a generic Nest 500.
 */
const SAFE_MESSAGE_FALLBACK = 'Internal Server Error';

/**
 * Base runtime exception for the whole monorepo. Rebased onto Nest's native
 * `HttpException` (rather than bare `Error` + a custom `ExceptionsFilter`
 * translation layer) so subclasses get `getStatus()`/`getResponse()` and
 * OpenAPI/error tooling that already understands `HttpException` for free.
 *
 * Every subclass assigns `this.errorCode` (and often augments `this.context`)
 * AFTER calling `super()`, so the response body can't be composed eagerly in
 * the constructor without baking in the wrong `errorCode`. Instead
 * {@link getResponse} composes the body lazily, at render time — Nest's
 * exception handling always calls `getResponse()` when it actually needs the
 * body (e.g. `BaseExceptionFilter.catch`), by which point every subclass
 * constructor has already run.
 */
export class RuntimeException
  extends HttpException
  implements RuntimeExceptionInterface
{
  /**
   * Machine-readable error code. A plain public field — NOT an accessor
   * pair — because Nest's `HttpException` declares `errorCode` as a native
   * class field, which would otherwise shadow a subclass-defined accessor.
   */
  public errorCode = 'RUNTIME_EXCEPTION';

  /**
   * The HTTP status this exception renders with (same value passed to the
   * `HttpException` constructor — exposed here too since many consumers
   * read `.httpStatus` directly instead of calling `getStatus()`).
   */
  readonly httpStatus: HttpStatus;

  /**
   * Who is at fault for this exception — `'client'`, `'usage'` (the
   * integrating developer misused the library), or `'internal'` (a bug or
   * unexpected infrastructure failure). Defaults to `'internal'` so an
   * unclassified exception fails loud rather than silently under-logging.
   *
   * Independent of `httpStatus` (a 400 can be `'usage'`; a 500 can be
   * `'client'`) and deliberately absent from {@link getResponse} — this is
   * triage data for a peer logging/observability module, not part of the
   * wire contract.
   */
  readonly fault: RuntimeExceptionFault;

  /**
   * If set, this message is used on responses instead of `message`.
   *
   * Use this when the main message might expose sensitive detail.
   */
  readonly safeMessage?: string;

  /**
   * Additional context.
   */
  public context: RuntimeExceptionContext = {};

  constructor(
    message?: string,
    options?: Omit<RuntimeExceptionOptions, 'message'>,
  );
  constructor(options?: RuntimeExceptionOptions);

  constructor(
    messageOrOptions?: string | RuntimeExceptionOptions,
    options?: Omit<RuntimeExceptionOptions, 'message'>,
  ) {
    let message: string | undefined;

    let finalOptions:
      RuntimeExceptionOptions | Omit<RuntimeExceptionOptions, 'message'> = {};

    if (typeof messageOrOptions === 'object') {
      message = messageOrOptions?.message;
      finalOptions = messageOrOptions;
    } else if (options) {
      message = messageOrOptions;
      finalOptions = options;
    } else {
      message = messageOrOptions;
    }

    if (typeof message !== 'string') {
      message = 'Runtime Exception';
    }

    const {
      messageParams = [],
      safeMessage,
      safeMessageParams = [],
      originalError,
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
      fault = 'internal',
    } = finalOptions;

    const formattedMessage = format(message ?? '', ...messageParams);
    const formattedSafeMessage = format(
      safeMessage ?? '',
      ...safeMessageParams,
    );

    const cause =
      originalError !== undefined
        ? mapNonErrorToException(originalError)
        : undefined;

    super(
      formattedMessage.length ? formattedMessage : formattedSafeMessage,
      httpStatus,
      { cause },
    );

    this.httpStatus = httpStatus;
    this.fault = fault;

    if (formattedSafeMessage.length) {
      this.safeMessage = formattedSafeMessage;
    }

    if (cause) {
      this.context.originalError = cause;
    }
  }

  /**
   * Composes the wire body lazily so it always reflects the final
   * `errorCode`/`context` state, which subclasses only finish assigning
   * after `super()` returns.
   */
  public override getResponse(): HttpExceptionBody {
    const statusCode = this.getStatus();

    const message =
      this.safeMessage ??
      (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
        ? SAFE_MESSAGE_FALLBACK
        : this.message);

    const body: HttpExceptionBody = {
      statusCode,
      message,
      errorCode: this.errorCode,
    };

    const error = STATUS_CODES[statusCode];
    if (error !== undefined) {
      body.error = error;
    }

    return body;
  }
}
