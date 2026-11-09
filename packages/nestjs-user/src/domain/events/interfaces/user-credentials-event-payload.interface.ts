import { type UserCredentialInterface } from '../../interfaces/user-credential.interface.js';

export interface UserCredentialsEventPayloadInterface extends Omit<
  UserCredentialInterface,
  'passwordHash'
> {}
