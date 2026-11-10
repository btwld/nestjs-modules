import { type AccessRoleActorInterface } from './access-role-actor.interface.js';
import { type AccessSystemActorInterface } from './access-system-actor.interface.js';

/**
 * Who is acting: a person through their roles, or an external system.
 */
export type AccessActor = AccessRoleActorInterface | AccessSystemActorInterface;
