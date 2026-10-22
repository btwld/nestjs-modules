import { RuntimeException } from '@concepta/nestjs-core';

import { AuthenticationException } from '../authentication.exception.js';

describe(AuthenticationException.name, () => {
  it('should extend RuntimeException', () => {
    const exception = new AuthenticationException();
    expect(exception).toBeInstanceOf(RuntimeException);
  });

  it('should have default message "Credentials are incorrect."', () => {
    const exception = new AuthenticationException();

    expect(exception.message).toEqual('Runtime Exception');
  });
});
