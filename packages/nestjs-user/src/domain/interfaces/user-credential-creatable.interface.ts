import { type UserCredentialInterface } from './user-credential.interface.js';

export interface UserCredentialCreatableInterface extends Pick<
  UserCredentialInterface,
  'userId' | 'passwordHash'
> {}
