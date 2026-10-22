import { type DynamicModule, type Provider } from '@nestjs/common';

import { type OtpRepositoryInterface } from '../../../domain/repositories/otp-repository.interface.js';
import { type OtpRepository } from '../../persistence/otp.repository.js';

/**
 * A repository class built once per `forFeature` key, around that key's
 * repository. Extend `OtpRepository` to write one.
 */
export type OtpRepositoryConstructor = new (
  ...args: ConstructorParameters<typeof OtpRepository>
) => OtpRepositoryInterface;

export interface OtpExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  repositories?: {
    otp?: OtpRepositoryConstructor;
  };
}
