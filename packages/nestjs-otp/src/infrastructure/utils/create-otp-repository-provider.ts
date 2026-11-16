import { type Provider } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { OTP_CUSTOM_REPOSITORY_TOKEN } from '../../otp.constants.js';
import { type OtpRepositoryConstructor } from '../config/interfaces/otp-extras.interface.js';
import { type OtpEntityInterface } from '../persistence/interfaces/otp-entity.interface.js';
import { OtpMapper } from '../persistence/otp.mapper.js';
import { OtpRepository } from '../persistence/otp.repository.js';

/**
 * Generates a dynamic repository token for a given OTP entity key.
 *
 * @param entityKey - Entity key to generate the repository token for (e.g., 'confirm-email')
 */
export function getDynamicOtpRepositoryToken(entityKey: string): string {
  return `OTP_REPOSITORY_${entityKey.toUpperCase()}`;
}

export function createOtpRepositoryProvider(entityKey: string): Provider {
  return {
    provide: getDynamicOtpRepositoryToken(entityKey),
    inject: [
      getDynamicRepositoryToken(entityKey),
      OtpMapper,
      OTP_CUSTOM_REPOSITORY_TOKEN,
    ],
    useFactory: (
      repository: RepositoryInterface<OtpEntityInterface>,
      mapper: OtpMapper,
      customRepo: OtpRepositoryConstructor | null,
    ) => {
      const RepoClass = customRepo ?? OtpRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
