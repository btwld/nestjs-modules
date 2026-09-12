import { type IdentityInterface } from './identity.interface.js';

export interface IdentityCreatableInterface extends Pick<
  IdentityInterface,
  'provider' | 'subject' | 'user'
> {}
