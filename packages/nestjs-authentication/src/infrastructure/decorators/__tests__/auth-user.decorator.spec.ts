import { mock } from 'vitest-mock-extended';

import { type ArgumentsHost, type ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;

import { AuthUserContextOverlay } from '../../../gateways/auth-user-context.overlay.js';
import { AuthUser } from '../auth-user.decorator.js';

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

const getDecoratorFactory = (): ParamFactory => {
  class Probe {
    test(@AuthUser() _user: unknown): void {
      return;
    }
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Probe,
    'test',
  ) as Record<string, { factory: ParamFactory }>;
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
};

const buildExecutionContext = (request: object): ExecutionContext => {
  const httpArgsHost = mock<HttpArgumentsHost>();
  httpArgsHost.getRequest.mockReturnValue(request);
  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue(httpArgsHost);
  return ctx;
};

const attachOverlay = (request: object): void => {
  const overlay = new AuthUserContextOverlay();
  overlay.attach(buildExecutionContext(request));
};

describe('AuthUser', () => {
  it('should return the user from the AuthUserCtx overlay', () => {
    const factory = getDecoratorFactory();
    const user = { id: 'user-1', username: 'alice' };
    const request = { user };
    attachOverlay(request);

    const result = factory(undefined, buildExecutionContext(request));

    expect(result).toEqual(user);
  });

  it('should return undefined when the overlay has no user', () => {
    const factory = getDecoratorFactory();
    const request: Record<string, unknown> = {};
    attachOverlay(request);

    const result = factory(undefined, buildExecutionContext(request));

    expect(result).toBeUndefined();
  });

  it('should read the user via the overlay, not directly from the request', () => {
    const factory = getDecoratorFactory();
    const request: Record<string, unknown> = { user: { id: 'user-1' } };
    attachOverlay(request);
    request.user = { id: 'attacker' };

    const result = factory(undefined, buildExecutionContext(request));

    expect(result).toEqual({ id: 'user-1' });
  });
});
