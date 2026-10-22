/**
 * Password storage interface
 */
export interface PasswordStorageInterface {
  /**
   * Hashed password (bcrypt format, salt embedded)
   */
  passwordHash: string;
}
