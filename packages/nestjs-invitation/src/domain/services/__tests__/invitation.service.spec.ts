import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { HttpStatus } from '@nestjs/common';

import { AppContextHost } from '@concepta/nestjs-core';

import {
  createMockInvitationRepository,
  createMockInvitationEntity,
  createMockEventPublisher,
  createMockTransaction,
  toInvitationDomain,
} from '../../../__tests__/helpers/mock.helpers.js';
import { InvitationNotFoundException } from '../../../application/exceptions/invitation-not-found.exception.js';
import { InvitationUserUndefinedException } from '../../../application/exceptions/invitation-user-undefined.exception.js';
import { Invitation } from '../../aggregates/invitation.js';
import { type InvitationOtpPort } from '../../ports/invitation-otp.port.js';
import { type InvitationUserPort } from '../../ports/invitation-user.port.js';
import { InvitationService } from '../invitation.service.js';

describe(InvitationService.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockInvitationRepository>;
  let mockOtpPort: DeepMockProxy<InvitationOtpPort>;
  let mockUserPort: DeepMockProxy<InvitationUserPort>;
  let service: InvitationService;
  let trxHandle: ReturnType<typeof createMockTransaction>['trxHandle'];

  const mockUser = { id: 'test-user-id', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = createMockInvitationRepository();

    mockOtpPort = mockDeep<InvitationOtpPort>();
    mockUserPort = mockDeep<InvitationUserPort>();

    const eventPublisher = createMockEventPublisher();
    const { transaction, trxHandle: trx } = createMockTransaction();
    trxHandle = trx;

    service = new InvitationService(
      mockRepo,
      transaction as never,
      eventPublisher as never,
      mockOtpPort,
      mockUserPort,
    );
  });

  describe('create', () => {
    const dto = {
      code: 'test-code',
      category: 'user',
      userId: 'test-user-id',
      constraints: undefined,
    };

    beforeEach(() => {
      mockUserPort.getById.mockResolvedValue(mockUser as never);
      mockOtpPort.create.mockResolvedValue({
        passcode: 'abc',
        expirationDate: new Date(),
      } as never);
    });

    it('should create, save, and send an invitation', async () => {
      const result = await service.create(ctx, dto);

      expect(result).toBeInstanceOf(Invitation);
      expect(result.code).toBe('test-code');
      expect(result.category).toBe('user');
      expect(result.userId).toBe('test-user-id');
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(mockOtpPort.create).toHaveBeenCalledTimes(1);
    });

    it('should register onCommit and onRollback', async () => {
      await service.create(ctx, dto);

      expect(trxHandle.onCommit).toHaveBeenCalled();
      expect(trxHandle.onRollback).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should create OTP, find user, and register commit/rollback', async () => {
      const invitation = toInvitationDomain(createMockInvitationEntity());

      const otp = {
        passcode: 'abc123',
        expirationDate: new Date('2026-02-01'),
      };
      mockOtpPort.create.mockResolvedValue(otp as never);
      mockUserPort.getById.mockResolvedValue(mockUser as never);

      await service.send(ctx, invitation);

      expect(mockOtpPort.create).toHaveBeenCalledTimes(1);
      const [otpCtx, otpCategory, otpUserId] = mockOtpPort.create.mock.calls[0];
      expect(otpCtx).toBeInstanceOf(AppContextHost);
      expect(otpCategory).toBe('user');
      expect(otpUserId).toBe('test-user-id');

      expect(mockUserPort.getById).toHaveBeenCalledTimes(1);
      const [userCtx, userId] = mockUserPort.getById.mock.calls[0];
      expect(userCtx).toBeInstanceOf(AppContextHost);
      expect(userId).toBe('test-user-id');
      expect(trxHandle.onCommit).toHaveBeenCalledTimes(1);
      expect(trxHandle.onRollback).toHaveBeenCalledTimes(1);
    });

    it('should throw InvitationUserUndefinedException when user not found', async () => {
      const invitation = toInvitationDomain(createMockInvitationEntity());

      mockUserPort.getById.mockResolvedValue(null);

      await expect(service.send(ctx, invitation)).rejects.toThrow(
        InvitationUserUndefinedException,
      );
    });

    it('should classify a dangling userId as internal/usage, not client', async () => {
      const invitation = toInvitationDomain(createMockInvitationEntity());

      mockUserPort.getById.mockResolvedValue(null);

      try {
        await service.send(ctx, invitation);
        throw new Error('Expected InvitationUserUndefinedException');
      } catch (e) {
        expect(e).toBeInstanceOf(InvitationUserUndefinedException);
        expect((e as InvitationUserUndefinedException).fault).toBe('usage');
        expect((e as InvitationUserUndefinedException).httpStatus).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  });

  describe('sendById', () => {
    it('should fetch invitation and delegate to send', async () => {
      const invitation = toInvitationDomain(createMockInvitationEntity());
      mockRepo.get.mockResolvedValue(invitation);
      mockUserPort.getById.mockResolvedValue(mockUser as never);
      mockOtpPort.create.mockResolvedValue({
        passcode: 'abc',
        expirationDate: new Date(),
      } as never);

      await service.sendById(ctx, 'test-id');

      expect(mockRepo.get).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'test-id',
      );
      expect(mockOtpPort.create).toHaveBeenCalledTimes(1);
    });

    it('should throw InvitationNotFoundException when not found', async () => {
      mockRepo.get.mockResolvedValue(null);

      await expect(service.sendById(ctx, 'missing-id')).rejects.toThrow(
        InvitationNotFoundException,
      );
    });
  });

  describe('accept', () => {
    it('should return the accepted invitation when OTP is valid', async () => {
      const invitation = toInvitationDomain(createMockInvitationEntity());
      mockRepo.findOneByCode.mockResolvedValue(invitation);
      mockUserPort.getById.mockResolvedValue(mockUser as never);
      mockOtpPort.consume.mockResolvedValue({
        assigneeId: 'test-user-id',
      } as never);

      // revokeByUserId will find invitations directly (no user lookup)
      mockRepo.findAllByUserAndCategory.mockResolvedValue([]);

      const result = await service.accept(ctx, 'test-code', 'abc123');

      expect(result).toBeInstanceOf(Invitation);
      expect(mockOtpPort.consume).toHaveBeenCalledTimes(1);
      const [consumeCtx, consumeCategory, consumePasscode] =
        mockOtpPort.consume.mock.calls[0];
      expect(consumeCtx).toBeInstanceOf(AppContextHost);
      expect(consumeCategory).toBe('user');
      expect(consumePasscode).toBe('abc123');
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should return null when OTP returns null', async () => {
      const invitation = toInvitationDomain(createMockInvitationEntity());
      mockRepo.findOneByCode.mockResolvedValue(invitation);
      mockUserPort.getById.mockResolvedValue(mockUser as never);
      mockOtpPort.consume.mockResolvedValue(null);

      const result = await service.accept(ctx, 'test-code', 'bad');

      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should throw InvitationNotFoundException when not found', async () => {
      mockRepo.findOneByCode.mockResolvedValue(null);

      await expect(service.accept(ctx, 'missing', 'abc')).rejects.toThrow(
        InvitationNotFoundException,
      );
    });

    it('should revoke sibling invitations after acceptance', async () => {
      const invitation = toInvitationDomain(createMockInvitationEntity());
      const sibling = toInvitationDomain(
        createMockInvitationEntity({ id: 'sibling-id', code: 'other-code' }),
      );

      mockRepo.findOneByCode.mockResolvedValue(invitation);
      mockUserPort.getById.mockResolvedValue(mockUser as never);
      mockOtpPort.consume.mockResolvedValue({
        assigneeId: 'test-user-id',
      } as never);
      mockRepo.findAllByUserAndCategory.mockResolvedValue([sibling]);

      await service.accept(ctx, 'test-code', 'abc123');

      // 1 save for accept + 1 save for sibling revoke
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('revokeByEmail', () => {
    it('should revoke active invitations for user+category', async () => {
      mockUserPort.getByEmail.mockResolvedValue(mockUser as never);

      const inv1 = toInvitationDomain(
        createMockInvitationEntity({ id: 'inv-1' }),
      );
      const inv2 = toInvitationDomain(
        createMockInvitationEntity({ id: 'inv-2' }),
      );
      mockRepo.findAllByUserAndCategory.mockResolvedValue([inv1, inv2]);

      await service.revokeByEmail(ctx, 'test@example.com', 'user');

      expect(mockUserPort.getByEmail).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'test@example.com',
      );
      expect(mockRepo.findAllByUserAndCategory).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'test-user-id',
        'user',
      );
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
      expect(trxHandle.onCommit).toHaveBeenCalledTimes(2);
      expect(trxHandle.onRollback).toHaveBeenCalledTimes(2);
    });

    it('should return early when no invitations found', async () => {
      mockUserPort.getByEmail.mockResolvedValue(mockUser as never);
      mockRepo.findAllByUserAndCategory.mockResolvedValue([]);

      await service.revokeByEmail(ctx, 'test@example.com', 'user');

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should throw InvitationUserUndefinedException when user not found', async () => {
      mockUserPort.getByEmail.mockResolvedValue(null);

      await expect(
        service.revokeByEmail(ctx, 'unknown@example.com', 'user'),
      ).rejects.toThrow(InvitationUserUndefinedException);
    });

    it('should classify no-user-for-email as client/BAD_REQUEST', async () => {
      mockUserPort.getByEmail.mockResolvedValue(null);

      try {
        await service.revokeByEmail(ctx, 'unknown@example.com', 'user');
        throw new Error('Expected InvitationUserUndefinedException');
      } catch (e) {
        expect(e).toBeInstanceOf(InvitationUserUndefinedException);
        expect((e as InvitationUserUndefinedException).fault).toBe('client');
        expect((e as InvitationUserUndefinedException).httpStatus).toBe(
          HttpStatus.BAD_REQUEST,
        );
      }
    });
  });

  describe('revokeByUserId', () => {
    it('should revoke active invitations for userId+category', async () => {
      const inv1 = toInvitationDomain(
        createMockInvitationEntity({ id: 'inv-1' }),
      );
      const inv2 = toInvitationDomain(
        createMockInvitationEntity({ id: 'inv-2' }),
      );
      mockRepo.findAllByUserAndCategory.mockResolvedValue([inv1, inv2]);

      await service.revokeByUserId(ctx, 'test-user-id', 'user');

      expect(mockRepo.findAllByUserAndCategory).toHaveBeenCalledWith(
        expect.any(AppContextHost),
        'test-user-id',
        'user',
      );
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
      expect(trxHandle.onCommit).toHaveBeenCalledTimes(2);
      expect(trxHandle.onRollback).toHaveBeenCalledTimes(2);
    });

    it('should return early when no active invitations', async () => {
      mockRepo.findAllByUserAndCategory.mockResolvedValue([]);

      await service.revokeByUserId(ctx, 'test-user-id', 'user');

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should not require a user lookup', async () => {
      mockRepo.findAllByUserAndCategory.mockResolvedValue([]);

      await service.revokeByUserId(ctx, 'test-user-id', 'user');

      expect(mockUserPort.getByEmail).not.toHaveBeenCalled();
      expect(mockUserPort.getById).not.toHaveBeenCalled();
    });
  });
});
