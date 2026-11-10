import { type RoleActorInterface } from './role-actor.interface.js';
import { type SystemActorInterface } from './system-actor.interface.js';

/**
 * Who is acting: a person through their roles, or a system.
 */
export type Actor = RoleActorInterface | SystemActorInterface;
