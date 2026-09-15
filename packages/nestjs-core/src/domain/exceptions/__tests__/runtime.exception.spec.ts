import { HttpException, HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '../interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../runtime.exception.js';

describe(RuntimeException.name, () => {
  const testError = new Error('my error');

  it('should accept zero params', () => {
    const exception = new RuntimeException();
    expect(exception).toBeInstanceOf(HttpException);
    expect(exception).toBeInstanceOf(RuntimeException);
    expect(exception.message).toEqual('Runtime Exception');
    expect(exception.errorCode).toEqual('RUNTIME_EXCEPTION');
    expect(exception.httpStatus).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.getStatus()).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.name).toEqual('RuntimeException');
    expect(exception.fault).toEqual('internal');
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
    expect(exception.context.originalError).toEqual(testError);
    expect(exception.cause).toEqual(testError);
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
    expect(exception.context.originalError).toEqual(testError);
    expect(exception.cause).toEqual(testError);
  });

  it('should map a non-Error originalError to a NotAnErrorException, on both cause and context', () => {
    const originalError = { some: 'value' };
    const exception = new RuntimeException({ originalError });

    expect(exception.cause).toBeInstanceOf(Error);
    expect(exception.context.originalError).toBe(exception.cause);
  });

  describe('fault', () => {
    it('defaults to internal', () => {
      const exception = new RuntimeException();
      expect(exception.fault).toEqual('internal');
    });

    it('accepts an explicit fault via options', () => {
      const exception = new RuntimeException({ fault: 'client' });
      expect(exception.fault).toEqual('client');
    });

    it('lets a subclass set its own default fault, independent of httpStatus', () => {
      class ConfigException extends RuntimeException {
        constructor() {
          super({ httpStatus: HttpStatus.BAD_REQUEST, fault: 'usage' });
        }
      }

      const exception = new ConfigException();
      expect(exception.fault).toEqual('usage');
      expect(exception.httpStatus).toEqual(HttpStatus.BAD_REQUEST);
    });

    it('lets a caller override a subclass default fault, same as httpStatus', () => {
      class ClientException extends RuntimeException {
        constructor(options?: RuntimeExceptionOptions) {
          super({ fault: 'client', ...options });
        }
      }

      const exception = new ClientException({ fault: 'internal' });
      expect(exception.fault).toEqual('internal');
    });

    it('is never rendered on the wire', () => {
      const exception = new RuntimeException({ fault: 'client' });
      expect(exception.getResponse()).not.toHaveProperty('fault');
    });
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

  describe('getResponse', () => {
    it('composes a native HttpExceptionBody for the default (500) case', () => {
      const exception = new RuntimeException();

      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
        error: 'Internal Server Error',
        errorCode: 'RUNTIME_EXCEPTION',
      });
    });

    it('suppresses the detailed message on 5xx when no safeMessage is set', () => {
      const exception = new RuntimeException('sensitive detail', {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      });

      expect(exception.message).toEqual('sensitive detail');
      expect(exception.getResponse().message).toEqual('Internal Server Error');
    });

    it('prefers safeMessage over the fallback on 5xx', () => {
      const exception = new RuntimeException('sensitive detail', {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        safeMessage: 'a safe message',
      });

      expect(exception.getResponse().message).toEqual('a safe message');
    });

    it('prefers safeMessage over message on non-5xx', () => {
      const exception = new RuntimeException('the real message', {
        httpStatus: HttpStatus.BAD_REQUEST,
        safeMessage: 'the safe message',
      });

      expect(exception.getResponse().message).toEqual('the safe message');
    });

    it('uses message directly on non-5xx when no safeMessage is set', () => {
      const exception = new RuntimeException('the real message', {
        httpStatus: HttpStatus.NOT_FOUND,
      });

      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'the real message',
        error: 'Not Found',
        errorCode: 'RUNTIME_EXCEPTION',
      });
    });

    it('reflects an errorCode assigned by a subclass AFTER super() returns', () => {
      class ChildException extends RuntimeException {
        constructor() {
          super({ httpStatus: HttpStatus.NOT_FOUND });
          this.errorCode = 'CHILD_ERROR';
        }
      }

      const exception = new ChildException();

      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Runtime Exception',
        error: 'Not Found',
        errorCode: 'CHILD_ERROR',
      });
    });
  });
});
