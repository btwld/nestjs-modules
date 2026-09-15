import { Injectable } from '@nestjs/common';

import { PasswordRequiredException } from '../exceptions/password-required.exception.js';
import { PasswordHashObjectOptionsInterface } from '../interfaces/password-hash-object-options.interface.js';
import { PasswordStorageServiceInterface } from '../interfaces/password-storage-service.interface.js';
import { PasswordPlainInterface } from '../password/interfaces/password-plain.interface.js';
import { PasswordStorageInterface } from '../password/interfaces/password-storage.interface.js';
import { CryptUtil } from '../utils/crypt.util.js';

/**
 * Service with functions related to password security
 */
@Injectable()
export class PasswordStorageService implements PasswordStorageServiceInterface {
  /**
   * Hash a password using bcrypt.
   *
   * @param password - Password to be hashed
   */
  async hash(password: string): Promise<PasswordStorageInterface> {
    return {
      passwordHash: await CryptUtil.hashPassword(password),
    };
  }

  /**
   * Hash password for an object.
   *
   * @param object - An object containing the new password to hash.
   * @param options - Hash object options
   * @returns A new object with the password hashed.
   */
  async hashObject<T extends PasswordPlainInterface>(
    object: T,
    options?: PasswordHashObjectOptionsInterface,
  ): Promise<Omit<T, 'password'> & PasswordStorageInterface>;

  /**
   * Hash password for an object if the password property exists.
   *
   * @param object - An object containing the new password to hash.
   * @param options - Hash object options
   * @returns A new object with the password hashed.
   */
  async hashObject<T extends PasswordPlainInterface>(
    object: Partial<T>,
    options?: PasswordHashObjectOptionsInterface,
  ): Promise<
    Omit<T, 'password'> | (Omit<T, 'password'> & PasswordStorageInterface)
  >;

  /**
   * Hash password for an object.
   *
   * @param object - An object containing the new password to hash.
   * @param options - Hash object options
   * @returns A new object with the password hashed.
   */
  async hashObject<T extends PasswordPlainInterface>(
    object: T,
    options?: PasswordHashObjectOptionsInterface,
  ): Promise<
    Omit<T, 'password'> | (Omit<T, 'password'> & PasswordStorageInterface)
  > {
    const { required = true } = options ?? {};
    const { password, ...safeObject } = object;

    if (typeof password === 'string') {
      const hashed = await this.hash(password);
      return { ...safeObject, ...hashed };
    } else if (required === true) {
      throw new PasswordRequiredException();
    }

    return safeObject;
  }
}
