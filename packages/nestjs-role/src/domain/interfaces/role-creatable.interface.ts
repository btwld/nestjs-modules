import { type RoleInterface } from './role.interface.js';

export interface RoleCreatableInterface extends Pick<
  RoleInterface,
  'name' | 'description'
> {}
