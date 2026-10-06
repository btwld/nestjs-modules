import { OtpMapper } from '../../persistence/otp.mapper.js';
import { OtpRepository } from '../../persistence/otp.repository.js';
import {
  createOtpRepositoryProvider,
  getDynamicOtpRepositoryToken,
} from '../create-otp-repository-provider.js';

describe('getDynamicOtpRepositoryToken', () => {
  it('should return an uppercased token with OTP_REPOSITORY_ prefix', () => {
    expect(getDynamicOtpRepositoryToken('userOtp')).toBe(
      'OTP_REPOSITORY_USEROTP',
    );
  });
});

describe('createOtpRepositoryProvider', () => {
  it('should return a provider with the correct token', () => {
    const provider = createOtpRepositoryProvider('userOtp');

    expect(provider).toEqual(
      expect.objectContaining({
        provide: 'OTP_REPOSITORY_USEROTP',
      }),
    );
  });

  it('should have a useFactory that returns an OtpRepository', () => {
    const provider = createOtpRepositoryProvider('userOtp');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const factory = (provider as { useFactory: Function }).useFactory;

    const mockRepository = {} as never;
    const mockMapper = new OtpMapper();

    const result = factory(mockRepository, mockMapper);

    expect(result).toBeInstanceOf(OtpRepository);
  });
});
