import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';

import { type ArgumentsHost, type ExecutionContext } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

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

  // The resolver keeps its own reference, so it gets a frozen copy, never
  // the object it handed over.
  it('defines a frozen copy of the actor the resolver returns', async () => {
    const request = {};
    const roles = ['a'];

    await new AccessContextOverlay({
      actorFor: async () => ({ kind: 'role', roles }),
    }).attach(httpContext(request));

    const actor = getAppContext(request).with(ActorCtx);
    const actorRoles = actor.kind === 'role' ? actor.roles : undefined;
    expect(actorRoles).toEqual(['a']);
    expect(actorRoles).not.toBe(roles);
    expect(Object.isFrozen(actorRoles)).toBe(true);
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

  // Off HTTP the actor is defined by a guard of the implementer's, or the
  // resolver works it out when a check asks.
  it('never asks the resolver on another transport', async () => {
    // A call that has a context, so only the transport keeps it out.
    const context = new ExecutionContextHost([null, {}]);
    context.setType('rpc');
    const actorFor = vi.fn();
    const handled = of('handled');

    const result = await new AccessContextOverlay({ actorFor }).intercept(
      context,
      { handle: () => handled },
    );

    expect(result).toBe(handled);
    expect(actorFor).not.toHaveBeenCalled();
  });

  it('is a context overlay for ActorCtx', () => {
    expect(
      new AccessContextOverlay({ actorFor: async () => undefined }).ref,
    ).toBe(ActorCtx);
  });
});
