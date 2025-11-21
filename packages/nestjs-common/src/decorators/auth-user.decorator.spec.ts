import { mock } from 'jest-mock-extended';

import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

import { AuthUser } from './auth-user.decorator';

interface UserInterface {
  user: { username: string };
}

describe(AuthUser.name, () => {
  interface ValueInterface {}

  const getParamDecoratorFactory = (decorator: () => ParameterDecorator) => {
    class TestController {
      public test(@decorator() value: ValueInterface) {
        return value;
      }
    }

    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'test',
    );
    return args[Object.keys(args)[0]].factory;
  };
  const factory = getParamDecoratorFactory(AuthUser);
  const context = mock<ExecutionContext>();
  const httpArgumentsHost = mock<HttpArgumentsHost>();
  const testUser = { username: 'my_username' };

  jest.spyOn(httpArgumentsHost, 'getRequest').mockImplementation(() => {
    return { user: testUser } as UserInterface;
  });

  jest.spyOn(context, 'switchToHttp').mockImplementation(() => {
    return httpArgumentsHost;
  });

  it('should match username', async () => {
    const result = factory(null, context);
    expect(result.username).toBe(testUser.username);
  });

  it('should get property of the user', async () => {
    const result = factory('username', context);
    expect(result).toBe(testUser.username);
  });

  it('should get property undefined ', async () => {
    jest.spyOn(httpArgumentsHost, 'getRequest').mockImplementation(() => {
      return { user: undefined };
    });
    const result = factory('username', context);
    expect(result).toBe(undefined);
  });

  it('should get property undefined ', async () => {
    const result = factory('email', context);
    expect(result).toBe(undefined);
  });
});
