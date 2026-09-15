import { SetMetadata } from '@nestjs/common';

export const OTP_NAMESPACE_KEY = 'OTP_NAMESPACE';

export interface OtpNamespaceOptions {
  name: string;
}

export const OtpNamespace = (options: OtpNamespaceOptions) =>
  SetMetadata(OTP_NAMESPACE_KEY, options);
