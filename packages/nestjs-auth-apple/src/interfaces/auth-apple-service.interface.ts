import { type AuthAppleProfileInterface } from './auth-apple-profile.interface';

export interface AuthAppleServiceInterface {
  verifyIdToken(idToken: string): Promise<AuthAppleProfileInterface>;
  validateClaims(profile: AuthAppleProfileInterface): void;
}
