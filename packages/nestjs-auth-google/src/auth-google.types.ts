import { type AuthGoogleCredentialsInterface } from './interfaces/auth-google-credentials.interface';
import { type AuthGoogleProfileInterface } from './interfaces/auth-google-profile.interface';

export type MapProfile = (
  profile: AuthGoogleProfileInterface,
) => AuthGoogleCredentialsInterface;
