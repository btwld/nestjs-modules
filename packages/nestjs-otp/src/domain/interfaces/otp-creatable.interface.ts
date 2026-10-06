import { type OtpInterface } from './otp.interface.js';

export interface OtpCreatableInterface extends Pick<
  OtpInterface,
  'category' | 'type' | 'assigneeId'
> {
  expiresIn: string;
  /**
   * The minimum number of seconds that must pass between OTP generation requests.
   * When provided, this will override the default rateSeconds setting.
   */
  rateSeconds?: number;

  /**
   * How many attempts before the user is blocked within the rateSeconds time window.
   * When provided, this will override the default rateThreshold setting.
   * For example, if rateSeconds is 60 and rateThreshold is 3, the user will be blocked
   * after 3 failed attempts within 60 seconds.
   */
  rateThreshold?: number;
}
