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
import { Otp } from '../../../../domain/aggregates/otp.js';
import { OtpLimitReachedException } from '../../../../domain/exceptions/otp-limit-reached.exception.js';
import { OtpTypeNotDefinedException } from '../../../../domain/exceptions/otp-type-not-defined.exception.js';
import { OtpPolicy } from '../../../../domain/policies/otp.policy.js';
import { type OtpSettingsInterface } from '../../../../infrastructure/config/interfaces/otp-settings.interface.js';
import { CreateOtpCommand } from '../../impl/create-otp.command.js';
import { CreateOtpHandler } from '../create-otp.handler.js';

describe(CreateOtpHandler.name, () => {
  let handler: CreateOtpHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;
  let mockResolver: ReturnType<typeof createMockRepositoryResolver>;
  let mockTx: ReturnType<typeof createMockTransaction>;
  let mockPublisher: ReturnType<typeof createMockEventPublisher>;
  let mockSettings: ReturnType<typeof createMockOtpSettings>;

  const ctx = {};

  const validDto = {
    category: 'test-category',
    type: 'uuid',
    assigneeId: 'test-assignee',
    expiresIn: '1h',
  };

  function makeHandler(
    settingsOverrides: Partial<OtpSettingsInterface> = {},
  ): CreateOtpHandler {
    return new CreateOtpHandler(
      mockResolver,
      mockTx.transaction,
      mockPublisher,
      new OtpPolicy({ ...mockSettings, ...settingsOverrides }),
    );
  }

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    mockResolver = createMockRepositoryResolver(mockRepo);
    mockTx = createMockTransaction();
    mockPublisher = createMockEventPublisher();
    mockSettings = createMockOtpSettings();

    handler = makeHandler();
  });

  it('should create an OTP and save it', async () => {
    const command = new CreateOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, validDto);

    const result = await handler.execute(command);

    expect(result).toBeInstanceOf(Otp);
    expect(result.category).toBe('test-category');
    expect(result.type).toBe('uuid');
    expect(result.assigneeId).toBe('test-assignee');
    expect(result.passcode).toBe('generated-passcode');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should throw OtpTypeNotDefinedException for unknown type', async () => {
    const command = new CreateOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      ...validDto,
      type: 'unknown',
    });

    await expect(handler.execute(command)).rejects.toThrow(
      OtpTypeNotDefinedException,
    );
  });

  it('should register onCommit and onRollback callbacks', async () => {
    const command = new CreateOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, validDto);

    await handler.execute(command);

    expect(mockTx.trxHandle.onCommit).toHaveBeenCalled();
    expect(mockTx.trxHandle.onRollback).toHaveBeenCalled();
  });

  describe('duplicateStrategy', () => {
    it('should deactivate existing active OTP when duplicateStrategy is DEACTIVATE', async () => {
      const existingOtp = toOtpDomain(
        createMockOtpEntity({ id: 'existing', passcode: 'old' }),
      );
      mockRepo.findActiveByAssignee.mockResolvedValue(existingOtp);

      const command = new CreateOtpCommand(
        ctx,
        DEFAULT_OTP_NAMESPACE,
        validDto,
        {
          duplicateStrategy: 'DEACTIVATE',
        },
      );
      await handler.execute(command);

      expect(mockRepo.findActiveByAssignee).toHaveBeenCalled();
      // save called twice: once for deactivation, once for new OTP
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should not deactivate when duplicateStrategy is ALLOW', async () => {
      const command = new CreateOtpCommand(
        ctx,
        DEFAULT_OTP_NAMESPACE,
        validDto,
        {
          duplicateStrategy: 'ALLOW',
        },
      );
      await handler.execute(command);

      expect(mockRepo.findActiveByAssignee).not.toHaveBeenCalled();
    });

    it('should use settings.duplicateStrategy when not specified in command', async () => {
      handler = makeHandler({ duplicateStrategy: 'DEACTIVATE' });
      mockRepo.findActiveByAssignee.mockResolvedValue(null);

      const command = new CreateOtpCommand(
        ctx,
        DEFAULT_OTP_NAMESPACE,
        validDto,
      );
      await handler.execute(command);

      expect(mockRepo.findActiveByAssignee).toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should throw OtpLimitReachedException when rate limit exceeded', async () => {
      mockRepo.countCreatedSince.mockResolvedValue(5);

      const command = new CreateOtpCommand(
        ctx,
        DEFAULT_OTP_NAMESPACE,
        validDto,
        {
          rateSeconds: 60,
          rateThreshold: 3,
        },
      );

      await expect(handler.execute(command)).rejects.toThrow(
        OtpLimitReachedException,
      );
    });

    it('should not throw when under rate limit', async () => {
      mockRepo.countCreatedSince.mockResolvedValue(1);

      const command = new CreateOtpCommand(
        ctx,
        DEFAULT_OTP_NAMESPACE,
        validDto,
        {
          rateSeconds: 60,
          rateThreshold: 3,
        },
      );

      await expect(handler.execute(command)).resolves.toBeInstanceOf(Otp);
    });

    it('should skip rate limiting when rateSeconds is not set', async () => {
      const command = new CreateOtpCommand(
        ctx,
        DEFAULT_OTP_NAMESPACE,
        validDto,
      );

      await handler.execute(command);

      expect(mockRepo.countCreatedSince).not.toHaveBeenCalled();
    });

    it('should use settings rate values when command does not specify them', async () => {
      handler = makeHandler({ rateSeconds: 60, rateThreshold: 5 });
      mockRepo.countCreatedSince.mockResolvedValue(0);

      const command = new CreateOtpCommand(
        ctx,
        DEFAULT_OTP_NAMESPACE,
        validDto,
      );
      await handler.execute(command);

      expect(mockRepo.countCreatedSince).toHaveBeenCalled();
    });
  });
});
