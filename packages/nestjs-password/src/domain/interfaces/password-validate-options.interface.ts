import { type PasswordPlainInterface } from '../password/interfaces/password-plain.interface.js';
import { type PasswordStorageInterface } from '../password/interfaces/password-storage.interface.js';

export interface PasswordValidateOptionsInterface
  extends PasswordPlainInterface, PasswordStorageInterface {}
