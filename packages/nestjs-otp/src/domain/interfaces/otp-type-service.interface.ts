/**
 * Interface for OTP type services.
 *
 * Each OTP type (e.g., email, SMS) must implement this interface to define
 * how OTPs are generated and validated for that specific type.
 */
export interface OtpTypeServiceInterface {
  generator(): string;
  validator(a: unknown, b: unknown): boolean;
}
