import { mock } from 'vitest-mock-extended';

import {
  type ArgumentsHost,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { type ModuleRef, Reflector } from '@nestjs/core';

import {
  type Actor,
  ActorCtx,
  type AuthorityInterface,
  OverlayImmutableException,
  requireAppContext,
} from '@concepta/nestjs-core';

import {
  ACCESS_CONTROL_MODULE_GRANT_METADATA,
  ACCESS_CONTROL_MODULE_QUERY_METADATA,
} from '../../../access-control.constants.js';
import { AccessControlException } from '../../../domain/exceptions/access-control.exception.js';
import { type AccessControlContextInterface } from '../../../domain/interfaces/access-control-context.interface.js';
import { type AccessGrantsProviderInterface } from '../../../domain/interfaces/access-grants-provider.interface.js';
import { type AccessGrants } from '../../../domain/interfaces/access-grants.type.js';
import { type CanAccess } from '../../../domain/interfaces/can-access.interface.js';
import { AccessControlService } from '../../../domain/services/access-control.service.js';
import { createAccessAbility } from '../../../domain/utils/create-access-ability.util.js';
import { StaticAccessGrantsProvider } from '../../../infrastructure/grants/static-access-grants.provider.js';
import { AccessDecisionCtx } from '../../interfaces/access-decision-context.interface.js';
import { AccessControlGuard } from '../access-control.guard.js';

type RpcArgumentsHost = ReturnType<ArgumentsHost['switchToRpc']>;
type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;

describe(AccessControlGuard.name, () => {
  class AllowingQuery implements CanAccess {
    canAccess = vi.fn(async (_context: AccessControlContextInterface) => true);
  }

  class RefusingQuery implements CanAccess {
    async canAccess(): Promise<boolean> {
      return false;
    }
  }

  class Handlers {
    open() {
      return null;
    }

    @SetMetadata(ACCESS_CONTROL_MODULE_GRANT_METADATA, [
      { resource: 'invoice', action: 'read' },
    ])
    read() {
      return null;
    }

    @SetMetadata(ACCESS_CONTROL_MODULE_GRANT_METADATA, [
      { resource: 'invoice', action: 'read' },
    ])
    @SetMetadata(ACCESS_CONTROL_MODULE_QUERY_METADATA, [
      { service: AllowingQuery },
    ])
    queried() {
      return null;
    }

    @SetMetadata(ACCESS_CONTROL_MODULE_QUERY_METADATA, [
      { service: AllowingQuery },
    ])
    queryOnly() {
      return null;
    }
  }

  @SetMetadata(ACCESS_CONTROL_MODULE_QUERY_METADATA, [
    { service: AllowingQuery },
  ])
  class QueriedHandlers {
    @SetMetadata(ACCESS_CONTROL_MODULE_GRANT_METADATA, [
      { resource: 'invoice', action: 'read' },
    ])
    @SetMetadata(ACCESS_CONTROL_MODULE_QUERY_METADATA, [
      { service: RefusingQuery },
    ])
    overridden() {
      return null;
    }
  }

  const handlers = new Handlers();
  const allowingQuery = new AllowingQuery();

  const rpcContext = (
    handler: () => null,
    controller: new () => object = Handlers,
  ) => {
    const rpcHost = mock<RpcArgumentsHost>();
    rpcHost.getContext.mockReturnValue({});
    const context = mock<ExecutionContext>();
    context.getType.mockReturnValue('rpc');
    context.switchToRpc.mockReturnValue(rpcHost);
    context.getHandler.mockReturnValue(handler);
    context.getClass.mockReturnValue(controller);
    return context;
  };

  const guardFor = (actor?: Actor) => {
    const actorFor = vi.fn().mockResolvedValue(actor);
    const moduleRef = mock<ModuleRef>();
    moduleRef.resolve.mockImplementation(async (service) =>
      service === RefusingQuery ? new RefusingQuery() : allowingQuery,
    );

    return {
      actorFor,
      guard: new AccessControlGuard(
        new AccessControlService(
          { actorFor },
          new StaticAccessGrantsProvider({
            'role:clerk': [{ action: 'read', subject: 'invoice' }],
          }),
        ),
        new Reflector(),
        moduleRef,
      ),
    };
  };

  it('lets a route without grants through, resolving nobody', async () => {
    const { guard, actorFor } = guardFor();

    expect(await guard.canActivate(rpcContext(handlers.open))).toEqual(true);
    expect(actorFor).not.toHaveBeenCalled();
  });

  it('fails a route with access query services but no grant, rather than skip them', async () => {
    const { guard } = guardFor({ kind: 'role', roles: ['clerk'] });

    await expect(
      guard.canActivate(rpcContext(handlers.queryOnly)),
    ).rejects.toThrow(
      expect.objectContaining({
        constructor: AccessControlException,
        fault: 'usage',
      }),
    );
  });

  it('lets a route’s access query services replace its controller’s', async () => {
    const { guard } = guardFor({ kind: 'role', roles: ['clerk'] });

    await expect(
      guard.canActivate(
        rpcContext(new QueriedHandlers().overridden, QueriedHandlers),
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        context: expect.objectContaining({ reason: 'access-query' }),
      }),
    );
  });

  it('names the requested action when nobody is acting', async () => {
    const { guard } = guardFor();

    await expect(guard.canActivate(rpcContext(handlers.read))).rejects.toThrow(
      expect.objectContaining({
        context: expect.objectContaining({
          action: 'read',
          subject: 'invoice',
          reason: 'no-actor',
        }),
      }),
    );
  });

  it('passes an HTTP execution context to the actor resolver', async () => {
    const { guard, actorFor } = guardFor({ kind: 'role', roles: ['clerk'] });
    const argsHost = mock<HttpArgumentsHost>();
    argsHost.getRequest.mockReturnValue({});
    const context = mock<ExecutionContext>();
    context.getType.mockReturnValue('http');
    context.switchToHttp.mockReturnValue(argsHost);
    context.getHandler.mockReturnValue(handlers.read);
    context.getClass.mockReturnValue(Handlers);

    expect(await guard.canActivate(context)).toEqual(true);
    expect(actorFor).toHaveBeenCalledWith(expect.anything(), context);
  });

  it('never lets an actor resolver read a message payload as the request', async () => {
    const { guard, actorFor } = guardFor({ kind: 'role', roles: ['clerk'] });

    await guard.canActivate(rpcContext(handlers.read));

    expect(actorFor).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('defines the actor on the context, so it is not resolved again', async () => {
    const { guard } = guardFor({ kind: 'role', roles: ['clerk'] });
    const context = rpcContext(handlers.read);

    await guard.canActivate(context);

    expect(requireAppContext(context).with(ActorCtx)).toEqual({
      kind: 'role',
      roles: ['clerk'],
    });
  });

  it('defines the actor immutably, so nothing after it can act as someone else', async () => {
    const { guard } = guardFor({ kind: 'role', roles: ['clerk'] });
    const context = rpcContext(handlers.read);

    await guard.canActivate(context);

    expect(() =>
      requireAppContext(context).defineOverlay(ActorCtx, {
        kind: 'role',
        roles: ['admin'],
      }),
    ).toThrow(OverlayImmutableException);
  });

  it('records the grant the call got in on immutably', async () => {
    const { guard } = guardFor({ kind: 'role', roles: ['clerk'] });
    const context = rpcContext(handlers.read);

    await guard.canActivate(context);

    expect(() =>
      requireAppContext(context).defineOverlay(AccessDecisionCtx, {
        query: {
          actor: { kind: 'role', roles: ['admin'] },
          action: 'read',
          resource: 'invoice',
        },
        ability: createAccessAbility([{ action: 'read', subject: 'invoice' }]),
      }),
    ).toThrow(OverlayImmutableException);
  });

  it('checks a call once when a controller and its route both apply it', async () => {
    const rulesFor = vi
      .fn<AccessGrantsProviderInterface['rulesFor']>()
      .mockResolvedValue([{ action: 'read', subject: 'invoice' }]);
    const guard = new AccessControlGuard(
      new AccessControlService(
        { actorFor: async () => ({ kind: 'role', roles: ['clerk'] }) },
        { rulesFor },
      ),
      new Reflector(),
      mock<ModuleRef>(),
    );
    const context = rpcContext(handlers.read);

    expect(await guard.canActivate(context)).toEqual(true);
    expect(await guard.canActivate(context)).toEqual(true);
    expect(rulesFor).toHaveBeenCalledTimes(1);
  });

  it('names a deny as the reason a route is refused', async () => {
    const actorFor = vi
      .fn()
      .mockResolvedValue({ kind: 'role', roles: ['clerk'] });
    const guard = new AccessControlGuard(
      new AccessControlService(
        { actorFor },
        new StaticAccessGrantsProvider({
          'role:clerk': [
            { action: 'read', subject: 'invoice', inverted: true },
          ],
        }),
      ),
      new Reflector(),
      mock<ModuleRef>(),
    );

    await expect(guard.canActivate(rpcContext(handlers.read))).rejects.toThrow(
      expect.objectContaining({
        context: expect.objectContaining({
          action: 'read',
          subject: 'invoice',
          reason: 'denied',
        }),
      }),
    );
  });

  it('hands access query services no request outside HTTP', async () => {
    const { guard } = guardFor({ kind: 'role', roles: ['clerk'] });

    expect(await guard.canActivate(rpcContext(handlers.queried))).toEqual(true);
    expect(
      allowingQuery.canAccess.mock.calls[0]?.[0].getRequest(),
    ).toBeUndefined();
  });

  describe('with an authority', () => {
    const auditor: Actor = { kind: 'role', roles: ['auditor'] };

    /** An authority allowing `<verb> <object>` keys, refusing the rest. */
    const allowing = (...allowed: string[]): AuthorityInterface => ({
      decide: async (_ctx, { action, object }) =>
        allowed.includes(`${action} ${object}`)
          ? { effect: 'allow' }
          : { effect: 'refuse', gate: 'DEC-4' },
    });

    const governedGuard = (
      authority: AuthorityInterface,
      grants: AccessGrants = {},
      actor: Actor = auditor,
    ) =>
      new AccessControlGuard(
        new AccessControlService(
          { actorFor: async () => actor },
          new StaticAccessGrantsProvider(grants),
          undefined,
          { decider: authority },
        ),
        new Reflector(),
        mock<ModuleRef>(),
      );

    it('lets a route through on the authority alone', async () => {
      const context = rpcContext(handlers.read);

      expect(
        await governedGuard(allowing('read invoice')).canActivate(context),
      ).toEqual(true);
      expect(requireAppContext(context).with(AccessDecisionCtx).query).toEqual({
        actor: auditor,
        action: 'read',
        resource: 'invoice',
      });
    });

    it('refuses a route the authority refuses, naming the pending decision', async () => {
      await expect(
        governedGuard(allowing()).canActivate(rpcContext(handlers.read)),
      ).rejects.toThrow(
        expect.objectContaining({
          context: expect.objectContaining({
            subject: 'invoice',
            reason: 'authority',
            gate: 'DEC-4',
          }),
        }),
      );
    });

    it('defines a copy of the actor whose roles nothing can change', async () => {
      const roles = ['auditor'];
      const context = rpcContext(handlers.read);

      await governedGuard(
        allowing('read invoice'),
        {},
        {
          kind: 'role',
          roles,
        },
      ).canActivate(context);

      const defined = requireAppContext(context).with(ActorCtx);
      expect(defined).toEqual({ kind: 'role', roles: ['auditor'] });
      if (defined.kind === 'role') {
        expect(defined.roles).not.toBe(roles);
        expect(Object.isFrozen(defined.roles)).toEqual(true);
      }
    });

    it('records what the actor may read, for the response filter', async () => {
      const context = rpcContext(handlers.read);

      await governedGuard(allowing('read invoice')).canActivate(context);

      expect(
        requireAppContext(context)
          .with(AccessDecisionCtx)
          .ability.can('read', 'invoice', 'total'),
      ).toEqual(true);
    });
  });
});
