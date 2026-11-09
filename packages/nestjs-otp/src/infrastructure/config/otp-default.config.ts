import { registerAs } from '@nestjs/config';

import { OTP_MODULE_DEFAULT_SETTINGS_TOKEN } from '../../otp.constants.js';
import { uuidGeneratorUtil } from '../utils/uuid-generator.util.js';
import { uuidValidatorUtil } from '../utils/uuid-validator.util.js';

import { type OtpSettingsInterface } from './interfaces/otp-settings.interface.js';

/**
 * Default configuration for Otp module.
 */
export const otpDefaultConfig = registerAs(
  OTP_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): OtpSettingsInterface => ({
    types: {
      uuid: {
        generator: uuidGeneratorUtil,
        validator: uuidValidatorUtil,
      },
    },
    duplicateStrategy: parseDuplicateStrategy(
      process.env.OTP_DUPLICATE_STRATEGY ?? 'DEACTIVATE',
    ),
    keepHistoryDays: process.env.OTP_KEEP_HISTORY_DAYS
      ? Number.parseInt(process.env.OTP_KEEP_HISTORY_DAYS, 10)
      : undefined,
    rateSeconds: process.env.OTP_RATE_SECONDS
      ? Number.parseInt(process.env.OTP_RATE_SECONDS, 10)
      : undefined,
    rateThreshold: process.env.OTP_RATE_THRESHOLD
      ? Number.parseInt(process.env.OTP_RATE_THRESHOLD, 10)
      : undefined,
  }),
);

function parseDuplicateStrategy(value: unknown): 'DEACTIVATE' | 'ALLOW' {
  const upperValue = String(value).toUpperCase();

  switch (upperValue) {
    case 'DEACTIVATE':
      return 'DEACTIVATE';
    case 'ALLOW':
      return 'ALLOW';
  }

  throw new Error(
    `Invalid OTP_DUPLICATE_STRATEGY value: ${value}. Must be 'DEACTIVATE' or 'ALLOW'.`,
  );
}
