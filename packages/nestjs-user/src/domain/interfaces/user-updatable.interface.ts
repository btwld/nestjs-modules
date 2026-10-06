import { type UserCreatableInterface } from './user-creatable.interface.js';

export interface UserUpdatableInterface extends Partial<
  Pick<UserCreatableInterface, 'email' | 'active'>
> {}
