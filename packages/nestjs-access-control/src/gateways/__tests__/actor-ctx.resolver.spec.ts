import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';

import { ActorCtx, AppContextHost } from '@concepta/nestjs-core';

import { ActorCtxResolver } from '../actor-ctx.resolver.js';

describe(ActorCtxResolver.name, () => {
  it('returns the actor the ActorCtx overlay carries, before any fallback', async () => {
    const actorFor = vi.fn();
    const ctx = new AppContextHost();
    ctx.defineOverlay(
      ActorCtx,
      { kind: 'system', name: 'agile' },
      { immutable: true },
    );

    expect(await new ActorCtxResolver({ actorFor }).actorFor(ctx)).toEqual({
      kind: 'system',
      name: 'agile',
    });
    expect(actorFor).not.toHaveBeenCalled();
  });

  it('asks the fallback without the overlay, passing the execution context', async () => {
    const context = mock<ExecutionContext>();
    const ctx = new AppContextHost();
    const actorFor = vi.fn().mockResolvedValue({ kind: 'role', roles: ['a'] });

    expect(
      await new ActorCtxResolver({ actorFor }).actorFor(ctx, context),
    ).toEqual({ kind: 'role', roles: ['a'] });
    expect(actorFor).toHaveBeenCalledWith(ctx, context);
  });

  it('returns nobody without the overlay or a fallback', async () => {
    expect(await new ActorCtxResolver().actorFor({})).toBeUndefined();
  });
});
