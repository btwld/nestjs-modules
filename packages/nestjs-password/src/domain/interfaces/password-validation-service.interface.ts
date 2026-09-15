import { type PasswordValidateOptionsInterface } from './password-validate-options.interface.js';

/**
 * Password Storage Validation Interface
 */
export interface PasswordValidationServiceInterface {
  /**
   * Validate if password matches and its valid.
   *
   * @param options - Validation options
   */
  validate(options: PasswordValidateOptionsInterface): Promise<boolean>;
}
