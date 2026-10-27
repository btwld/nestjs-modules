/**
 * Password Strength Service Interface
 */
export interface PasswordStrengthServiceInterface {
  /**
   * Check if Password is strong
   *
   * @param password - The plain text password
   */
  isStrong(password: string): boolean;
}
