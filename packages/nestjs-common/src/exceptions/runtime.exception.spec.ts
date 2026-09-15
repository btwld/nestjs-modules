import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from './interfaces/runtime-exception-options.interface';
import { RuntimeException } from './runtime.exception';

describe(RuntimeException.name, () => {
  const testError = new Error('my error');

  it('should accept zero params', () => {
    const exception = new RuntimeException();
    expect(exception).toBeInstanceOf(RuntimeException);
    expect(exception.message).toEqual('Runtime Exception');
    expect(exception.errorCode).toEqual('RUNTIME_EXCEPTION');
  });

  it('should accept only message param', () => {
    const exception = new RuntimeException('hello world');
    expect(exception).toBeInstanceOf(RuntimeException);
    expect(exception.message).toEqual('hello world');
  });

  it('should accept message and options params', () => {
    const options: RuntimeExceptionOptions = {
      messageParams: ['world'],
      safeMessage: 'foo %s',
      safeMessageParams: ['bar'],
      httpStatus: HttpStatus.BAD_REQUEST,
      originalError: testError,
    };

    const exception = new RuntimeException('hello %s', options);
    expect(exception).toBeInstanceOf(RuntimeException);
    expect(exception.message).toEqual('hello world');
    expect(exception.safeMessage).toEqual('foo bar');
    expect(exception.httpStatus).toEqual(HttpStatus.BAD_REQUEST);
    expect(exception['context']['originalError']).toBeInstanceOf(Error);
    expect(exception['context']['originalError']?.message).toEqual('my error');
  });

  it('should accept only options param', () => {
    const options: RuntimeExceptionOptions = {
      message: 'hello %s',
      messageParams: ['world'],
      safeMessage: 'foo %s',
      safeMessageParams: ['bar'],
      httpStatus: HttpStatus.BAD_REQUEST,
      originalError: testError,
    };

    const exception = new RuntimeException(options);
    expect(exception).toBeInstanceOf(RuntimeException);
    expect(exception.message).toEqual('hello world');
    expect(exception.safeMessage).toEqual('foo bar');
    expect(exception.httpStatus).toEqual(HttpStatus.BAD_REQUEST);
    expect(exception['context']['originalError']).toBeInstanceOf(Error);
    expect(exception['context']['originalError']?.message).toEqual('my error');
  });

  it('should allow setting error code', () => {
    class CustomRuntimeException extends RuntimeException {
      constructor() {
        super();
        this.errorCode = 'CUSTOM_CODE';
      }
    }

    const exception = new CustomRuntimeException();
    expect(exception).toBeInstanceOf(CustomRuntimeException);
    expect(exception.errorCode).toEqual('CUSTOM_CODE');
  });
});
