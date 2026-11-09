import { randomUUID } from 'crypto';

import { mock } from 'vitest-mock-extended';

import { HttpStatus } from '@nestjs/common';

import { type ReferenceIdInterface } from '@concepta/nestjs-core';

import { type LocalServiceInterface } from '../../../../application/services/local/interfaces/local-service.interface.js';
import { type LocalValidateUserInterface } from '../../../../application/services/local/interfaces/local-validate-user.interface.js';
import { LocalService } from '../../../../application/services/local/local.service.js';
import { LocalStrategyPolicy } from '../../../../domain/policies/local-strategy.policy.js';
import { type PasswordPort } from '../../../../domain/ports/password.port.js';
import {
  type AuthenticationUserResult,
  type UserPort,
} from '../../../../domain/ports/user.port.js';
import { LocalInvalidCredentialsException } from '../exceptions/local-invalid-credentials.exception.js';
import { LocalInvalidLoginDataException } from '../exceptions/local-invalid-login-data.exception.js';
import { LocalException } from '../exceptions/local.exception.js';
import { LocalStrategy } from '../local.strategy.js';
import { localLoginSchema } from '../schemas/local-login.schema.js';

describe(LocalStrategy.name, () => {
  const USERNAME = 'username';
  const PASSWORD = 'password';

  let user: NonNullable<AuthenticationUserResult>;
  let policy: LocalStrategyPolicy;
  let userPort: UserPort;
  let passwordPort: PasswordPort;
  let validateUserService: LocalServiceInterface;
  let localStrategy: LocalStrategy;

  beforeEach(async () => {
    policy = new LocalStrategyPolicy({
      loginSchema: localLoginSchema,
      usernameField: USERNAME,
      passwordField: PASSWORD,
    });

    userPort = mock<UserPort>();
    passwordPort = mock<PasswordPort>();
    validateUserService = new LocalService(userPort, passwordPort);
    localStrategy = new LocalStrategy(policy, validateUserService);

    user = {
      id: randomUUID(),
      email: 'test@example.com',
      username: 'test',
      active: true,
    };
    vi.resetAllMocks();
    void userPort.getByUsername;
    vi.spyOn(userPort, 'getByUsername').mockResolvedValue(user);
  });

  describe(LocalStrategy.prototype.validate, () => {
    it('should return user', async () => {
      void passwordPort.validate;
      vi.spyOn(passwordPort, 'validate').mockResolvedValue(true);

      const result = await localStrategy.validate({}, USERNAME, PASSWORD);
      expect(result.id).toBe(user.id);
    });

    it('should fail to validate user', async () => {
      vi.spyOn(validateUserService, 'validateUser').mockImplementationOnce(
        (_ctx, _dto: LocalValidateUserInterface) => {
          return null as unknown as Promise<ReferenceIdInterface<string>>;
        },
      );

      const t = () => localStrategy.validate({}, USERNAME, PASSWORD);
      await expect(t).rejects.toThrow(LocalInvalidCredentialsException);
    });

    it('should fail to validate user with custom message', async () => {
      vi.spyOn(validateUserService, 'validateUser').mockImplementation(
        (_ctx, _dto: LocalValidateUserInterface) => {
          throw new LocalInvalidCredentialsException({
            message: 'Custom message',
            safeMessage: 'Custom safe message',
          });
        },
      );

      const call = localStrategy.validate({}, USERNAME, PASSWORD);

      await expect(call).rejects.toBeInstanceOf(
        LocalInvalidCredentialsException,
      );
      await expect(call).rejects.toMatchObject({
        httpStatus: HttpStatus.UNAUTHORIZED,
        message: 'Custom message',
        safeMessage: 'Custom safe message',
      });
    });

    it('should fail with internal server error', async () => {
      vi.spyOn(validateUserService, 'validateUser').mockImplementation(
        (_ctx, _dto: LocalValidateUserInterface) => {
          throw new Error('This is really bad');
        },
      );

      const call = localStrategy.validate({}, USERNAME, PASSWORD);

      await expect(call).rejects.toBeInstanceOf(LocalException);
      await expect(call).rejects.toMatchObject({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        context: expect.objectContaining({
          originalError: expect.objectContaining({
            message: 'This is really bad',
          }),
        }),
      });
    });

    it('should throw error on validateOrReject', async () => {
      const t = () => localStrategy.validate({}, USERNAME, '');
      await expect(t).rejects.toThrow();
    });

    it('should throw BadRequest when login schema validation fails', async () => {
      vi.spyOn(localLoginSchema['~standard'], 'validate').mockResolvedValueOnce(
        { issues: [{ message: 'invalid' }] },
      );

      const t = () => localStrategy.validate({}, USERNAME, PASSWORD);
      await expect(t).rejects.toThrow(LocalInvalidLoginDataException);
    });

    it('should return no user on userPort.getByUsername', async () => {
      void userPort.getByUsername;
      vi.spyOn(userPort, 'getByUsername').mockResolvedValue(null);

      const t = () => localStrategy.validate({}, USERNAME, PASSWORD);
      await expect(t).rejects.toThrow(LocalInvalidCredentialsException);
    });

    it('should be invalid on passwordPort.validate', async () => {
      void passwordPort.validate;
      vi.spyOn(passwordPort, 'validate').mockResolvedValue(false);

      const t = () => localStrategy.validate({}, USERNAME, PASSWORD);
      await expect(t).rejects.toThrow(LocalInvalidCredentialsException);
    });
  });
});
