import { mock } from 'vitest-mock-extended';

import { type ArgumentsHost, type ExecutionContext } from '@nestjs/common';

import { ActorCtx, getAppContext } from '@concepta/nestjs-core';

import { AccessContextOverlay } from '../access-context.overlay.js';

type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;

describe(AccessContextOverlay.name, () => {
  const httpContext = (request: object) => {
    const argsHost = mock<HttpArgumentsHost>();
    argsHost.getRequest.mockReturnValue(request);
    const context = mock<ExecutionContext>();
    context.getType.mockReturnValue('http');
    context.switchToHttp.mockReturnValue(argsHost);
    return context;
  };

  it('defines the actor the resolver works out, immutably', async () => {
    const request = {};
    const context = httpContext(request);
    const actorFor = vi.fn().mockResolvedValue({ kind: 'role', roles: ['a'] });

    await new AccessContextOverlay({ actorFor }).attach(context);

    const ctx = getAppContext(request);
    expect(ctx.with(ActorCtx)).toEqual({ kind: 'role', roles: ['a'] });
    expect(actorFor).toHaveBeenCalledWith(ctx, context);
    expect(ctx.removeOverlay(ActorCtx)).toEqual(false);
  });

  it('leaves an actor already defined, without asking the resolver', async () => {
    const request = {};
    getAppContext(request).defineOverlay(
      ActorCtx,
      { kind: 'system', name: 'agile' },
      { immutable: true },
    );
    const actorFor = vi.fn();

    await new AccessContextOverlay({ actorFor }).attach(httpContext(request));

    expect(actorFor).not.toHaveBeenCalled();
  });

  it('defines nothing when nobody is acting', async () => {
    const request = {};

    await new AccessContextOverlay({
      actorFor: async () => undefined,
    }).attach(httpContext(request));

    expect(getAppContext(request).supports(ActorCtx)).toEqual(false);
  });

  it('is a context overlay for ActorCtx', () => {
    expect(
      new AccessContextOverlay({ actorFor: async () => undefined }).ref,
    ).toBe(ActorCtx);
  });
});
