export interface InvitationOtpSettingsInterface {
  type: string;
  expiresIn: string;
  rateSeconds?: number;
  rateThreshold?: number;
  namespace: string;
  clearOtpOnCreate?: boolean;
}
