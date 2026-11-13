import { type NestInterceptor } from '@nestjs/common';

import { type AccessActorResolverInterface } from '../../../domain/interfaces/access-actor-resolver.interface.js';
import { type AccessControlAuthorityInterface } from '../../../domain/interfaces/access-control-authority.interface.js';
import { type AccessGrantsProviderInterface } from '../../../domain/interfaces/access-grants-provider.interface.js';

import { type AccessControlSettingsInterface } from './access-control-settings.interface.js';

export interface AccessControlOptionsInterface {
  settings?: AccessControlSettingsInterface;
  /**
   * Works out who is acting when a call carries no `ActorCtx` overlay. On
   * a checked route it receives the route's execution context. Without
   * one, a call with no `ActorCtx` has nobody acting.
   */
  actorResolver?: AccessActorResolverInterface;
  /**
   * Supplies each actor's rules on every call. Defaults to
   * `settings.grants`.
   */
  grantsProvider?: AccessGrantsProviderInterface;
  /**
   * Decides each route first, as a repository governed by the same
   * authority decides its data: a route's resource is the authority's
   * object, its action the verb. The actor's rules then only narrow what it
   * allows. On a resource in `except`, and without one, the actor's rules
   * decide alone.
   */
  authority?: AccessControlAuthorityInterface;
  /**
   * Replaces the global response filter, or `false` to register none.
   */
  appFilter?: NestInterceptor | false;
}
