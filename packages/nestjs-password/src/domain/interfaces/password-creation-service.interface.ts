import { type PasswordStorageInterface } from '../password/interfaces/password-storage.interface.js';

import { type PasswordCurrentPasswordInterface } from './password-current-password.interface.js';
import { type PasswordHistoryPasswordInterface } from './password-history-password.interface.js';

/**
 * Password Creation Service Interface
 */
export interface PasswordCreationServiceInterface {
  /**
   * Create a hashed password.
   *
   * @param password - Password to be hashed
   */
  create(password: string): Promise<PasswordStorageInterface>;

  /**
   * Validate the current password for the targeted object.
   *
   * @param options - Validate current options.
   * @returns boolean
   */
  validateCurrent: (
    options: Partial<PasswordCurrentPasswordInterface>,
  ) => Promise<boolean>;

  /**
   * Validate the array of password stores to check for previous usage.
   *
   * @param options - Validate history options.
   * @returns boolean Returns true if password has NOT been used within configured range.
   */
  validateHistory: (
    options: PasswordHistoryPasswordInterface,
  ) => Promise<boolean>;
}
