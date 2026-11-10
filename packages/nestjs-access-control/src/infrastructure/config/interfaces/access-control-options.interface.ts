import { type NestInterceptor } from '@nestjs/common';

import { type AccessActorResolverInterface } from '../../../domain/interfaces/access-actor-resolver.interface.js';
import { type AccessGrantsProviderInterface } from '../../../domain/interfaces/access-grants-provider.interface.js';

import { type AccessControlSettingsInterface } from './access-control-settings.interface.js';

export interface AccessControlOptionsInterface {
  settings?: AccessControlSettingsInterface;
  /**
   * Works out who is acting when a call carries no `AccessCtx` overlay. On
   * a checked route it receives the route's execution context. Without
   * one, a call with no `AccessCtx` has nobody acting.
   */
  actorResolver?: AccessActorResolverInterface;
  /**
   * Supplies each actor's rules on every call. Defaults to
   * `settings.grants`.
   */
  grantsProvider?: AccessGrantsProviderInterface;
  /**
   * Replaces the global response filter, or `false` to register none.
   */
  appFilter?: NestInterceptor | false;
}
