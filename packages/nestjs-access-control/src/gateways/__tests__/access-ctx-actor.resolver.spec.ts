import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';

import { AppContextHost } from '@concepta/nestjs-core';

import { AccessCtxActorResolver } from '../access-ctx-actor.resolver.js';
import { AccessCtx } from '../interfaces/access-context.interface.js';

describe(AccessCtxActorResolver.name, () => {
  it('returns the actor the AccessCtx overlay carries, before any fallback', async () => {
    const actorFor = vi.fn();
    const ctx = new AppContextHost();
    ctx.defineOverlay(
      AccessCtx,
      { kind: 'system', name: 'agile' },
      { immutable: true },
    );

    expect(
      await new AccessCtxActorResolver({ actorFor }).actorFor(ctx),
    ).toEqual({
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
      await new AccessCtxActorResolver({ actorFor }).actorFor(ctx, context),
    ).toEqual({ kind: 'role', roles: ['a'] });
    expect(actorFor).toHaveBeenCalledWith(ctx, context);
  });

  it('returns nobody without the overlay or a fallback', async () => {
    expect(await new AccessCtxActorResolver().actorFor({})).toBeUndefined();
  });
});
