import { createTestEventContext } from '@concepta/nestjs-core/testing';

import {
  createMockEventPublisher,
  createMockPasswordPort,
  createMockTxScope,
  createMockUserCredentialEntity,
  createMockUserCredentialsRepository,
  toUserCredentialsDomain,
} from '../../../__tests__/helpers/mock.helpers.js';
import { UserCredentialsAlreadyExistException } from '../../exceptions/user-credentials-already-exist.exception.js';
import { UserPasswordCurrentInvalidException } from '../../exceptions/user-password-current-invalid.exception.js';
import { UserPasswordHistoryViolationException } from '../../exceptions/user-password-history-violation.exception.js';
import { UserPasswordPolicy } from '../../policies/user-password.policy.js';
import { UserCredentialsService } from '../user-credentials.service.js';

describe(UserCredentialsService.name, () => {
  const eventContext = createTestEventContext({}, {});
  const mockCredentialEntity = createMockUserCredentialEntity();

  function setup(policy?: UserPasswordPolicy) {
    const userCredentialsRepository = createMockUserCredentialsRepository();
    const txScope = createMockTxScope();
    const eventPublisher = createMockEventPublisher();
    const passwordPort = createMockPasswordPort();

    passwordPort.create.mockResolvedValue({
      passwordHash: 'new-hash',
    });

    const service = new UserCredentialsService(
      userCredentialsRepository,
      txScope,
      eventPublisher,
      passwordPort,
      policy ?? new UserPasswordPolicy(),
    );

    return {
      service,
      userCredentialsRepository,
      passwordPort,
    };
  }

  describe('setPassword', () => {
    it('should return new credentials when none exist', async () => {
      const { service, userCredentialsRepository } = setup();
      userCredentialsRepository.findActiveByUserId.mockResolvedValue(null);

      const result = await service.setPassword(
        {},
        eventContext,
        'user-1',
        'pass',
      );

      expect(result.userId).toBe('user-1');
      expect(result.passwordHash).toBe('new-hash');
      expect(result.active).toBe(true);
      expect(userCredentialsRepository.save).toHaveBeenCalled();
    });

    it('should hash a plain password via the password port', async () => {
      const { service, userCredentialsRepository, passwordPort } = setup();
      userCredentialsRepository.findActiveByUserId.mockResolvedValue(null);

      await service.setPassword({}, eventContext, 'user-1', 'pass');

      expect(passwordPort.create).toHaveBeenCalledWith('pass');
    });

    it('should store an already-hashed password storage object as-is', async () => {
      const { service, userCredentialsRepository, passwordPort } = setup();
      userCredentialsRepository.findActiveByUserId.mockResolvedValue(null);

      const result = await service.setPassword({}, eventContext, 'user-1', {
        passwordHash: 'pre-hashed',
      });

      expect(passwordPort.create).not.toHaveBeenCalled();
      expect(result.passwordHash).toBe('pre-hashed');
    });

    it('should throw when active credentials already exist', async () => {
      const { service, userCredentialsRepository } = setup();
      userCredentialsRepository.findActiveByUserId.mockResolvedValue(
        toUserCredentialsDomain(mockCredentialEntity),
      );

      await expect(
        service.setPassword({}, eventContext, 'user-1', 'pass'),
      ).rejects.toThrow(UserCredentialsAlreadyExistException);
    });
  });

  describe('updatePassword', () => {
    describe('default policy', () => {
      it('should create new credentials when none exist', async () => {
        const { service, userCredentialsRepository, passwordPort } = setup();
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(null);

        await expect(
          service.updatePassword({}, eventContext, 'user-1', 'new-pass'),
        ).resolves.toBeUndefined();

        expect(passwordPort.create).toHaveBeenCalledWith('new-pass');
        expect(userCredentialsRepository.save).toHaveBeenCalled();
      });

      it('should deactivate existing and create new', async () => {
        const { service, userCredentialsRepository } = setup();
        const existing = toUserCredentialsDomain(mockCredentialEntity);
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(
          existing,
        );

        await service.updatePassword({}, eventContext, 'user-1', 'new-pass');

        expect(existing.active).toBe(false);
        expect(userCredentialsRepository.save).toHaveBeenCalledTimes(2);
      });
    });

    describe('requireCurrent policy', () => {
      const policy = new UserPasswordPolicy({ requireCurrent: true });

      it('should throw when no active credentials exist', async () => {
        const { service, userCredentialsRepository } = setup(policy);
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(null);

        await expect(
          service.updatePassword(
            {},
            eventContext,
            'user-1',
            'new-pass',
            'current',
          ),
        ).rejects.toThrow(UserPasswordCurrentInvalidException);
      });

      it('should throw when passwordCurrent not provided', async () => {
        const { service, userCredentialsRepository } = setup(policy);
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(
          toUserCredentialsDomain(mockCredentialEntity),
        );

        await expect(
          service.updatePassword({}, eventContext, 'user-1', 'new-pass'),
        ).rejects.toThrow(UserPasswordCurrentInvalidException);
      });

      it('should throw when current password is invalid', async () => {
        const { service, userCredentialsRepository, passwordPort } =
          setup(policy);
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(
          toUserCredentialsDomain(mockCredentialEntity),
        );
        passwordPort.validateCurrent.mockResolvedValue(false);

        await expect(
          service.updatePassword(
            {},
            eventContext,
            'user-1',
            'new-pass',
            'wrong',
          ),
        ).rejects.toThrow(UserPasswordCurrentInvalidException);
      });

      it('should proceed when current password is valid', async () => {
        const { service, userCredentialsRepository, passwordPort } =
          setup(policy);
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(
          toUserCredentialsDomain(mockCredentialEntity),
        );
        passwordPort.validateCurrent.mockResolvedValue(true);

        await expect(
          service.updatePassword(
            {},
            eventContext,
            'user-1',
            'new-pass',
            'correct',
          ),
        ).resolves.toBeUndefined();
      });
    });

    describe('reuse restriction policy', () => {
      const policy = new UserPasswordPolicy({ reuseAfterDays: 30 });

      it('should throw when password was previously used', async () => {
        const { service, userCredentialsRepository, passwordPort } =
          setup(policy);
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(null);
        userCredentialsRepository.findByUserId.mockResolvedValue([
          toUserCredentialsDomain(mockCredentialEntity),
        ]);
        passwordPort.validateHistory.mockResolvedValue(false);

        await expect(
          service.updatePassword({}, eventContext, 'user-1', 'old-pass'),
        ).rejects.toThrow(UserPasswordHistoryViolationException);
      });

      it('should proceed when password is not reused', async () => {
        const { service, userCredentialsRepository, passwordPort } =
          setup(policy);
        userCredentialsRepository.findActiveByUserId.mockResolvedValue(null);
        userCredentialsRepository.findByUserId.mockResolvedValue([
          toUserCredentialsDomain(mockCredentialEntity),
        ]);
        passwordPort.validateHistory.mockResolvedValue(true);

        await expect(
          service.updatePassword({}, eventContext, 'user-1', 'unique-pass'),
        ).resolves.toBeUndefined();
      });
    });
  });
});
