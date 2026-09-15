import { type RoleInterface } from './role.interface.js';

export interface RoleUpdatableInterface extends Partial<
  Pick<RoleInterface, 'name' | 'description'>
> {}
