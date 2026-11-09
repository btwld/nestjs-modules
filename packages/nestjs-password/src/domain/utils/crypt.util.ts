import * as bcrypt from 'bcrypt';

/**
 * Abstract class with functions to encapsulate hash methods
 */
export abstract class CryptUtil {
  /**
   * Hash a password using bcrypt (salt is generated and embedded automatically).
   *
   * @param password - The plain text password to hash
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, await bcrypt.genSalt());
  }

  /**
   * Validate a plain password against a bcrypt hash using constant-time comparison.
   *
   * @param passwordPlain - The plain password
   * @param passwordHash - The bcrypt hash (salt embedded)
   */
  static async validatePassword(
    passwordPlain: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(passwordPlain, passwordHash);
  }
}
