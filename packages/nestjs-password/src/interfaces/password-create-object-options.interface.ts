import { PasswordStrengthEnum } from '../enum/password-strength.enum';

export interface PasswordCreateObjectOptionsInterface {
  /**
   * Optional salt. If not provided, one will be generated.
   */
  salt?: string;

  /**
   * Set to true if password is required.
   */
  required?: boolean;

  passwordStrength?: PasswordStrengthEnum | null;
}
