import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type ModuleRef } from '@nestjs/core';

import { OtpEntityNotFoundException } from '../../exceptions/otp-entity-not-found.exception.js';
import { OtpRepositoryResolver } from '../otp-repository.resolver.js';
import { type OtpRepository } from '../otp.repository.js';

describe(OtpRepositoryResolver.name, () => {
  let resolver: OtpRepositoryResolver;
  let mockModuleRef: DeepMockProxy<ModuleRef>;
  const mockRepo = {} as OtpRepository;

  beforeEach(() => {
    mockModuleRef = mockDeep<ModuleRef>();
    resolver = new OtpRepositoryResolver(mockModuleRef);
  });

  it('should resolve a repository by entity key', () => {
    mockModuleRef.get.mockReturnValue(mockRepo);

    const result = resolver.resolve('userOtp');

    expect(result).toBe(mockRepo);
    expect(mockModuleRef.get).toHaveBeenCalledWith('OTP_REPOSITORY_USEROTP', {
      strict: false,
    });
  });

  it('should throw OtpEntityNotFoundException when entity is not registered', () => {
    mockModuleRef.get.mockImplementation(() => {
      throw new Error('not found');
    });

    expect(() => resolver.resolve('unknown')).toThrow(
      OtpEntityNotFoundException,
    );
  });
});
