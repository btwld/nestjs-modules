import { type AccessActorResolverInterface } from '../../../../domain/interfaces/access-actor-resolver.interface.js';

/**
 * Stands in for authentication: the actor comes from `x-system`, `x-roles`
 * and `x-user` test headers. A real application takes it from the
 * authenticated user, never from client headers.
 */
export const headerActorResolverFixture: AccessActorResolverInterface = {
  actorFor: async (_ctx, context) => {
    const headers =
      context?.switchToHttp().getRequest<{
        headers: Record<string, string | undefined>;
      }>().headers ?? {};
    const system = headers['x-system'];
    const roles = headers['x-roles'];

    if (system) {
      return { kind: 'system', name: system };
    }

    return roles === undefined
      ? undefined
      : {
          kind: 'role',
          roles: roles.split(',').filter(Boolean),
          userId: headers['x-user'],
        };
  },
};
