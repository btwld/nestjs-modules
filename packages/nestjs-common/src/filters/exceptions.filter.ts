import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { HttpAdapterHost } from '@nestjs/core';

import {
  ERROR_CODE_UNKNOWN,
  ERROR_MESSAGE_FALLBACK,
} from '../constants/error-codes.constants';
import { ExceptionInterface } from '../exceptions/interfaces/exception.interface';
import { RuntimeException } from '../exceptions/runtime.exception';
import { mapHttpStatus } from '../utils/map-http-status.util';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: ExceptionInterface, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    // error code is UNKNOWN unless it gets overridden
    let errorCode = ERROR_CODE_UNKNOWN;

    // error is 500 unless it gets overridden
    let statusCode = 500;

    // what will this message be?
    let message: unknown = ERROR_MESSAGE_FALLBACK;

    // is this an http exception?
    if (exception instanceof HttpException) {
      // set the status code
      statusCode = exception.getStatus();
      // map the error code
      errorCode = mapHttpStatus(statusCode);
      // get res
      const res = exception.getResponse();
      // set the message
      if (isObject(res) && 'message' in res) {
        message = res.message;
      } else {
        message = res;
      }
    } else if (exception instanceof RuntimeException) {
      // its a runtime exception, set error code
      errorCode = exception.errorCode;
      // did they provide a status hint?
      if (exception.httpStatus) {
        statusCode = exception.httpStatus;
      }
      // set the message
      if (statusCode >= 500) {
        // use safe message or internal sever error
        message = exception.safeMessage ?? ERROR_MESSAGE_FALLBACK;
      } else if (exception.safeMessage) {
        // use the safe message
        message = exception.safeMessage;
      } else {
        // use the error message with safe message as fallback
        message =
          exception.message ?? exception.safeMessage ?? ERROR_MESSAGE_FALLBACK;
      }
    }

    const responseBody = {
      statusCode,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);
  }
}
