import { Strategy } from 'passport-local';

import { Inject, Injectable } from '@nestjs/common';

import {
  ReferenceIdInterface,
  ReferenceUsername,
  getAppContext,
} from '@concepta/nestjs-core';

import { LocalServiceInterface } from '../../../application/services/local/interfaces/local-service.interface.js';
import { LocalService } from '../../../application/services/local/local.service.js';
import { LocalStrategyPolicy } from '../../../domain/policies/local-strategy.policy.js';
import { PassportStrategyFactory } from '../../passport/passport-strategy.factory.js';

import { LocalInvalidCredentialsException } from './exceptions/local-invalid-credentials.exception.js';
import { LocalInvalidLoginDataException } from './exceptions/local-invalid-login-data.exception.js';
import { LocalException } from './exceptions/local.exception.js';
import { LOCAL_STRATEGY_NAME } from './local.constants.js';

/**
 * Define the Local strategy using passport.
 *
 * Local strategy is used to authenticate a user using a username and password.
 * The field username and password can be configured using the `usernameField` and `passwordField` properties.
 */
@Injectable()
export class LocalStrategy extends PassportStrategyFactory<Strategy>(
  Strategy,
  LOCAL_STRATEGY_NAME,
) {
  /**
   * @param policy - The local strategy policy
   * @param validateUserService - The service used validate passwords
   */
  constructor(
    @Inject(LocalStrategyPolicy)
    private policy: LocalStrategyPolicy,
    @Inject(LocalService)
    private validateUserService: LocalServiceInterface,
  ) {
    super({
      usernameField: policy.usernameField,
      passwordField: policy.passwordField,
      passReqToCallback: true,
    });
  }

  /**
   * Validate the user based on the username and password
   * from the request body
   *
   * @param req - The request object
   * @param username - The username to authenticate
   * @param password - The plain text password
   */
  async validate(req: unknown, username: ReferenceUsername, password: string) {
    const { loginSchema, usernameField, passwordField } = this.policy;

    if (!loginSchema) {
      throw new LocalException({
        message: 'Login schema is not configured.',
        fault: 'usage',
      });
    }

    const result = await loginSchema['~standard'].validate({
      [usernameField]: username,
      [passwordField]: password,
    });

    if (result.issues) {
      throw new LocalInvalidLoginDataException({
        originalError: result.issues,
      });
    }

    let validatedUser: ReferenceIdInterface;

    try {
      // try to get fully validated user
      validatedUser = await this.validateUserService.validateUser(
        getAppContext(req),
        {
          username,
          password,
        },
      );
    } catch (e) {
      // did they throw an invalid credentials exception?
      if (e instanceof LocalInvalidCredentialsException) {
        // yes, use theirs
        throw e;
      } else {
        // something else went wrong — deliberately flattened to a generic
        // 500 rather than passed through: a distinguishable status
        // (e.g. a 404 UserNotFoundException) here is a username-enumeration
        // oracle on a login endpoint.
        throw new LocalException({ originalError: e });
      }
    }

    // did we get a valid user?
    if (!validatedUser) {
      throw new LocalInvalidCredentialsException({
        message: `Unable to validate user with username: %s`,
        messageParams: [username],
      });
    }

    return validatedUser;
  }
}
