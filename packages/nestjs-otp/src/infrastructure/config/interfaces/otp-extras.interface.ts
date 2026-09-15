import { type DynamicModule, type Provider, type Type } from '@nestjs/common';

import { type OtpRepositoryInterface } from '../../../domain/repositories/otp-repository.interface.js';

export interface OtpExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  repositories?: {
    otp?: Type<OtpRepositoryInterface>;
  };
}
