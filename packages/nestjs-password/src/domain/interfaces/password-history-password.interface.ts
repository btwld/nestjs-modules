import { type PasswordPlainInterface } from '../password/interfaces/password-plain.interface.js';
import { type PasswordStorageInterface } from '../password/interfaces/password-storage.interface.js';

export interface PasswordHistoryPasswordInterface extends PasswordPlainInterface {
  targets: PasswordStorageInterface[];
}
