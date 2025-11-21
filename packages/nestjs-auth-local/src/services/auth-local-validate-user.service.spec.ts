import { PasswordValidationServiceInterface } from '@concepta/nestjs-password';

import { AuthLocalUserModelServiceInterface } from '../interfaces/auth-local-user-model-service.interface';
import { AuthLocalValidateUserInterface } from '../interfaces/auth-local-validate-user.interface';

import { AuthLocalValidateUserService } from './auth-local-validate-user.service';

describe(AuthLocalValidateUserService.name, () => {
  const USERNAME = 'test';
  const PASSWORD = 'test';

  let service: AuthLocalValidateUserService;
  let userModelService: AuthLocalUserModelServiceInterface;
  let passwordValidationService: PasswordValidationServiceInterface;

  beforeEach(() => {
    userModelService = {
      byUsername: jest.fn(),
    } as unknown as AuthLocalUserModelServiceInterface;

    passwordValidationService = {
      validate: jest.fn(),
    } as unknown as PasswordValidationServiceInterface;

    service = new AuthLocalValidateUserService(
      userModelService,
      passwordValidationService,
    );
  });

  describe('validateUser', () => {
    const USER = {
      active: false,
      id: 'uuid',
      username: 'username',
      password: 'password',
      passwordHash: 'hash',
      passwordSalt: 'salt',
    };
    it('should throw an error if no user is found for the given username', async () => {
      jest.spyOn(userModelService, 'byUsername').mockResolvedValue(null);

      const t = () =>
        service.validateUser({
          username: USERNAME,
          password: PASSWORD,
        } as AuthLocalValidateUserInterface);
      await expect(t).rejects.toThrow(
        `No user found for username: ${USERNAME}`,
      );
    });

    it('should throw an error if the user is inactive', async () => {
      jest.spyOn(userModelService, 'byUsername').mockResolvedValue(USER);
      jest.spyOn(service, 'isActive').mockResolvedValue(false);

      const t = () =>
        service.validateUser({
          username: USERNAME,
          password: PASSWORD,
        } as AuthLocalValidateUserInterface);
      await expect(t).rejects.toThrow(
        `User with username '${USERNAME}' is inactive`,
      );
    });

    it('should throw an error if the password is invalid', async () => {
      jest.spyOn(userModelService, 'byUsername').mockResolvedValue(USER);
      jest.spyOn(service, 'isActive').mockResolvedValue(true);
      jest
        .spyOn(passwordValidationService, 'validate')
        .mockResolvedValue(false);

      const t = () =>
        service.validateUser({
          username: USER.username,
          password: USER.password,
        } as AuthLocalValidateUserInterface);
      await expect(t).rejects.toThrow(
        `Invalid password for username: ${USER.username}`,
      );
    });

    it('should return the user if the user is found, active, and the password is valid', async () => {
      jest.spyOn(userModelService, 'byUsername').mockResolvedValue(USER);
      jest.spyOn(service, 'isActive').mockResolvedValue(true);
      jest.spyOn(passwordValidationService, 'validate').mockResolvedValue(true);

      const result = await service.validateUser({
        username: USER.username,
        password: USER.password,
      } as AuthLocalValidateUserInterface);

      expect(result).toEqual(USER);
    });
  });
});
