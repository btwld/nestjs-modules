import { type Actor } from '@concepta/nestjs-core';

/**
 * The grant a route was let through on: who is acting, and the action and
 * resource the route declared.
 */
export interface AccessQueryInterface {
  actor: Actor;
  action: string;
  resource: string;
}
