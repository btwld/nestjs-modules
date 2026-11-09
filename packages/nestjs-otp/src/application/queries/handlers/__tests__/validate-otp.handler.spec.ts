import { type Mock } from 'vitest';

import {
  createMockOtpEntity,
  createMockOtpRepository,
  createMockOtpSettings,
  createMockRepositoryResolver,
  DEFAULT_OTP_NAMESPACE,
  toOtpDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { OtpTypeNotDefinedException } from '../../../../domain/exceptions/otp-type-not-defined.exception.js';
import { OtpPolicy } from '../../../../domain/policies/otp.policy.js';
import { type OtpSettingsInterface } from '../../../../infrastructure/config/interfaces/otp-settings.interface.js';
import { ValidateOtpQuery } from '../../impl/validate-otp.query.js';
import { ValidateOtpHandler } from '../validate-otp.handler.js';

describe(ValidateOtpHandler.name, () => {
  let handler: ValidateOtpHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;
  let mockSettings: OtpSettingsInterface;

  const ctx = {};

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);
    mockSettings = createMockOtpSettings();

    handler = new ValidateOtpHandler(mockResolver, new OtpPolicy(mockSettings));
  });

  it('should return assigneeId when OTP is valid and active', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2099-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const query = new ValidateOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    const result = await handler.execute(query);

    expect(result).toEqual({ assigneeId: 'test-assignee' });
  });

  it('should call the configured validator for the OTP type', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2099-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const query = new ValidateOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    await handler.execute(query);

    expect(mockSettings.types['uuid'].validator).toHaveBeenCalledWith(
      'test-passcode',
      'test-passcode',
    );
  });

  it('should return null when configured validator returns false', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2099-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);
    (mockSettings.types['uuid'].validator as Mock).mockReturnValue(false);

    const query = new ValidateOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'wrong-passcode',
    });

    const result = await handler.execute(query);

    expect(result).toBeNull();
  });

  it('should throw OtpTypeNotDefinedException when type is not configured', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({
        type: 'unknown',
        expirationDate: new Date('2099-01-01'),
      }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const query = new ValidateOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    await expect(handler.execute(query)).rejects.toThrow(
      OtpTypeNotDefinedException,
    );
  });

  it('should return null when no active OTP found', async () => {
    mockRepo.findActiveByPasscode.mockResolvedValue(null);

    const query = new ValidateOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'missing',
    });

    const result = await handler.execute(query);

    expect(result).toBeNull();
  });

  it('should return null when OTP is expired', async () => {
    const otp = toOtpDomain(
      createMockOtpEntity({ expirationDate: new Date('2020-01-01') }),
    );
    mockRepo.findActiveByPasscode.mockResolvedValue(otp);

    const query = new ValidateOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      category: 'test-category',
      passcode: 'test-passcode',
    });

    const result = await handler.execute(query);

    expect(result).toBeNull();
  });
});
