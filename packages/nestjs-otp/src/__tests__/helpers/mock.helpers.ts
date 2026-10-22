import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import {
  createTestEventContext,
  createMockCommandBus,
  createMockEventPublisher,
  createMockQueryBus,
} from '@concepta/nestjs-core/testing';
import { createMockTransaction } from '@concepta/nestjs-repository/testing';

import { type Otp } from '../../domain/aggregates/otp.js';
import { type OtpSettingsInterface } from '../../infrastructure/config/interfaces/otp-settings.interface.js';
import { type OtpEntityInterface } from '../../infrastructure/persistence/interfaces/otp-entity.interface.js';
import { type OtpRepositoryResolver } from '../../infrastructure/persistence/otp-repository.resolver.js';
import { OtpMapper } from '../../infrastructure/persistence/otp.mapper.js';
import { type OtpRepository } from '../../infrastructure/persistence/otp.repository.js';

export const DEFAULT_OTP_NAMESPACE = 'userOtp';

export {
  createMockCommandBus,
  createMockEventPublisher,
  createMockQueryBus,
  createMockTransaction,
};
export type { MockTransactionHandle } from '@concepta/nestjs-repository/testing';

export function createMockOtpRepository(): DeepMockProxy<OtpRepository> {
  return mockDeep<OtpRepository>();
}

export function createMockRepositoryResolver(
  repo: OtpRepository,
): DeepMockProxy<OtpRepositoryResolver> {
  const resolver = mockDeep<OtpRepositoryResolver>();
  resolver.resolve.mockReturnValue(repo);
  return resolver;
}

export function createMockEventContext(namespace = DEFAULT_OTP_NAMESPACE) {
  return createTestEventContext({ namespace }, {});
}

export function createMockOtpEntity(
  overrides: Partial<OtpEntityInterface> = {},
): OtpEntityInterface {
  return {
    id: 'test-id',
    category: 'test-category',
    type: 'uuid',
    passcode: 'test-passcode',
    assigneeId: 'test-assignee',
    expirationDate: new Date('2027-01-01'),
    active: true,
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

const otpMapper = new OtpMapper();

export function toOtpDomain(entity: OtpEntityInterface): Otp {
  return otpMapper.toDomain(entity);
}

export function createMockOtpSettings(
  overrides: Partial<OtpSettingsInterface> = {},
): OtpSettingsInterface {
  return {
    types: {
      uuid: {
        generator: vi.fn().mockReturnValue('generated-passcode'),
        validator: vi.fn().mockReturnValue(true),
      },
    },
    duplicateStrategy: 'ALLOW',
    keepHistoryDays: undefined,
    rateSeconds: undefined,
    rateThreshold: undefined,
    ...overrides,
  };
}
