import { type OtpTypeServiceInterface } from '../../../domain/interfaces/otp-type-service.interface.js';

export interface OtpSettingsInterface {
  types: { [key: string]: OtpTypeServiceInterface };

  /**
   * Strategy for handling duplicate OTPs for the same assignee and category.
   *
   * Options:
   *  - 'ALLOW': Allow multiple active OTPs to exist simultaneously.
   *  - 'DEACTIVATE': Automatically deactivate any existing active OTPs before
   *    creating a new one.
   *
   * If undefined, the default behavior is 'DEACTIVATE', meaning only one active
   * OTP will be allowed per assignee and category.
   *
   * This helps prevent confusion and potential security issues from having multiple
   * valid OTPs at the same time.
   */
  duplicateStrategy: 'ALLOW' | 'DEACTIVATE';

  /**
   * Number of days to retain OTP history. When set, OTPs will be marked inactive
   * instead of deleted.
   *
   * If undefined, OTPs will be permanently deleted rather than retained.
   */
  keepHistoryDays?: number;

  /**
   * The minimum number of seconds that must pass between OTP generation requests.
   * This helps prevent abuse by rate limiting how frequently new OTPs can be created.
   */
  rateSeconds?: number;

  /**
   * How many attempts before the user is blocked within the rateSeconds time window.
   * For example, if rateSeconds is 60 and rateThreshold is 3, the user will be blocked
   * after 3 failed attempts within 60 seconds.
   */
  rateThreshold?: number;
}
