import { type Mock } from 'vitest';

import {
  createMockEventPublisher,
  createMockOtpEntity,
  createMockOtpRepository,
  createMockOtpSettings,
  createMockRepositoryResolver,
  createMockTransaction,
  DEFAULT_OTP_NAMESPACE,
  toOtpDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { OtpTypeNotDefinedException } from '../../../../domain/exceptions/otp-type-not-defined.exception.js';
import { OtpPolicy } from '../../../../domain/policies/otp.policy.js';
import { type OtpSettingsInterface } from '../../../../infrastructure/config/interfaces/otp-settings.interface.js';
import { ConsumeOtpCommand } from '../../impl/consume-otp.command.js';
import { ConsumeOtpHandler } from '../consume-otp.handler.js';

describe(ConsumeOtpHandler.name, () => {
  let handler: ConsumeOtpHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;
  let mockTx: ReturnType<typeof createMockTransaction>;
  let mockSettings: OtpSettingsInterface;

  const ctx = {};

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);
    mockTx = createMockTransaction();
    const mockPublisher = createMockEventPublisher();
    mockSettings = createMockOtpSettings();

    handler = new ConsumeOtpHandler(
      mockResolver,
      mockTx.transaction,
      mockPublisher,
      new OtpPolicy(mockSettings),
    );
  });

  it('should return assigneeId and delete OTP when valid and active', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2099-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const command = new ConsumeOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    const result = await handler.execute(command);

    expect(result).toEqual({ assigneeId: 'test-assignee' });
    expect(mockRepo.remove).toHaveBeenCalledWith(expect.anything(), otp);
  });

  it('should call the configured validator for the OTP type', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2099-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const command = new ConsumeOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    await handler.execute(command);

    expect(mockSettings.types['uuid'].validator).toHaveBeenCalledWith(
      'test-passcode',
      'test-passcode',
    );
  });

  it('should register onCommit and onRollback callbacks', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2099-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const command = new ConsumeOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    await handler.execute(command);

    expect(mockTx.trxHandle.onCommit).toHaveBeenCalled();
    expect(mockTx.trxHandle.onRollback).toHaveBeenCalled();
  });

  it('should return null and not delete when no active OTP found', async () => {
    mockRepo.findActiveByPasscode.mockResolvedValue(null);

    const command = new ConsumeOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'missing',
    });

    const result = await handler.execute(command);

    expect(result).toBeNull();
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it('should return null and not delete when OTP is expired', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2020-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const command = new ConsumeOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    const result = await handler.execute(command);

    expect(result).toBeNull();
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it('should return null and not delete when validator returns false', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2099-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);
    (mockSettings.types['uuid'].validator as Mock).mockReturnValue(false);

    const command = new ConsumeOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'wrong-passcode',
    });

    const result = await handler.execute(command);

    expect(result).toBeNull();
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it('should throw OtpTypeNotDefinedException when type is not configured', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({
        type: 'unknown',
        expirationDate: new Date('2099-01-01'),
      }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const command = new ConsumeOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    await expect(handler.execute(command)).rejects.toThrow(
      OtpTypeNotDefinedException,
    );
  });
});
