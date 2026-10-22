import { type AuthAppleCredentialsInterface } from './interfaces/auth-apple-credentials.interface';
import { type AuthAppleProfileInterface } from './interfaces/auth-apple-profile.interface';

export type MapProfile = (
  profile: AuthAppleProfileInterface,
) => AuthAppleCredentialsInterface;
