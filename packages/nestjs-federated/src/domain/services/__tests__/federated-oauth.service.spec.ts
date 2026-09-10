import { HttpStatus } from '@nestjs/common';
import { type EventPublisher } from '@nestjs/cqrs';

import { AppContextHost } from '@concepta/nestjs-core';

import {
  createMockEventPublisher,
  createMockIdentityRepository,
  createMockFederatedUserPort,
  createMockTransaction,
  createMockIdentityEntity,
  toIdentityDomain,
} from '../../../__tests__/helpers/mock.helpers.js';
import { type FederatedCredentialsInterface } from '../../../interfaces/federated-credentials.interface.js';
import { IdentityCreateUserException } from '../../exceptions/identity-create-user.exception.js';
import { IdentityFindUserException } from '../../exceptions/identity-find-user.exception.js';
import { IdentityUserRelationshipException } from '../../exceptions/identity-user-relationship.exception.js';
import { FederatedOAuthService } from '../federated-oauth.service.js';

describe(FederatedOAuthService, () => {
  let service: FederatedOAuthService;
  let identityRepo: ReturnType<typeof createMockIdentityRepository>;
  let userPort: ReturnType<typeof createMockFederatedUserPort>;
  let txScope: ReturnType<typeof createMockTransaction>['transaction'];
  let eventPublisher: EventPublisher;

  const mockUser: FederatedCredentialsInterface = {
    id: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
  };

  const mockIdentityEntity = createMockIdentityEntity();
  const mockIdentity = toIdentityDomain(mockIdentityEntity);

  beforeEach(() => {
    identityRepo = createMockIdentityRepository();
    userPort = createMockFederatedUserPort();

    const { transaction } = createMockTransaction();
    txScope = transaction;
    eventPublisher = createMockEventPublisher();

    service = new FederatedOAuthService(
      identityRepo,
      txScope,
      eventPublisher,
      userPort,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sign', () => {
    it('should return existing user when identity exists', async () => {
      identityRepo.findByProviderAndSubject.mockResolvedValue(mockIdentity);
      userPort.getById.mockResolvedValue(mockUser);

      const result = await service.sign(
        {},
        'google',
        'test@example.com',
        'subject-id',
      );

      expect(result).toEqual(mockUser);
      expect(identityRepo.findByProviderAndSubject).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'google',
        'subject-id',
      );
      expect(userPort.getById).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'user-id',
      );
    });

    it('should create new user and identity when they do not exist', async () => {
      identityRepo.findByProviderAndSubject.mockResolvedValue(null);
      userPort.getByEmail.mockResolvedValue(null);
      userPort.create.mockResolvedValue(mockUser);
      identityRepo.save.mockResolvedValue(undefined);

      const result = await service.sign(
        {},
        'google',
        'test@example.com',
        'subject-id',
      );

      expect(result).toEqual(mockUser);
      expect(identityRepo.findByProviderAndSubject).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'google',
        'subject-id',
      );
      expect(userPort.getByEmail).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'test@example.com',
      );
      expect(userPort.create).toHaveBeenCalledWith(expect.any(AppContextHost), {
        email: 'test@example.com',
        username: 'test@example.com',
      });
      expect(identityRepo.save).toHaveBeenCalled();
    });

    it('should use existing user when email exists but identity does not', async () => {
      identityRepo.findByProviderAndSubject.mockResolvedValue(null);
      userPort.getByEmail.mockResolvedValue(mockUser);
      identityRepo.save.mockResolvedValue(undefined);

      const result = await service.sign(
        {},
        'google',
        'test@example.com',
        'subject-id',
      );

      expect(result).toEqual(mockUser);
      expect(identityRepo.findByProviderAndSubject).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'google',
        'subject-id',
      );
      expect(userPort.getByEmail).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'test@example.com',
      );
      expect(userPort.create).not.toHaveBeenCalled();
      expect(identityRepo.save).toHaveBeenCalled();
    });

    it('should throw IdentityUserRelationshipException when identity exists but has no user', async () => {
      const identityWithoutUser = toIdentityDomain(
        createMockIdentityEntity({
          user: { id: null },
        }),
      );
      identityRepo.findByProviderAndSubject.mockResolvedValue(
        identityWithoutUser,
      );

      await expect(
        service.sign({}, 'google', 'test@example.com', 'subject-id'),
      ).rejects.toThrow(IdentityUserRelationshipException);
    });

    it('should classify a broken identity/user relation as internal/500, not client/404', async () => {
      const identityWithoutUser = toIdentityDomain(
        createMockIdentityEntity({
          user: { id: null },
        }),
      );
      identityRepo.findByProviderAndSubject.mockResolvedValue(
        identityWithoutUser,
      );

      try {
        await service.sign({}, 'google', 'test@example.com', 'subject-id');
        throw new Error('Expected IdentityUserRelationshipException');
      } catch (e) {
        expect(e).toBeInstanceOf(IdentityUserRelationshipException);
        expect((e as IdentityUserRelationshipException).httpStatus).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect((e as IdentityUserRelationshipException).fault).toBe('internal');
      }
    });

    it('should throw IdentityFindUserException when user is not found', async () => {
      identityRepo.findByProviderAndSubject.mockResolvedValue(mockIdentity);
      userPort.getById.mockResolvedValue(null);

      await expect(
        service.sign({}, 'google', 'test@example.com', 'subject-id'),
      ).rejects.toThrow(IdentityFindUserException);
    });

    it('should throw IdentityCreateUserException when user creation fails', async () => {
      identityRepo.findByProviderAndSubject.mockResolvedValue(null);
      userPort.getByEmail.mockResolvedValue(null);
      userPort.create.mockRejectedValue(new Error('Failed to create user'));

      await expect(
        service.sign({}, 'google', 'test@example.com', 'subject-id'),
      ).rejects.toThrow(IdentityCreateUserException);
    });

    it('should throw IdentityCreateUserException when user creation fails with non-Error', async () => {
      identityRepo.findByProviderAndSubject.mockResolvedValue(null);
      userPort.getByEmail.mockResolvedValue(null);
      userPort.create.mockRejectedValue('string error');

      await expect(
        service.sign({}, 'google', 'test@example.com', 'subject-id'),
      ).rejects.toThrow(IdentityCreateUserException);
    });
  });
});
