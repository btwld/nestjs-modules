import { type AuthAppleCredentialsInterface as AuthAppleCredentialsInterface } from '../interfaces/auth-apple-credentials.interface';
import { type AuthAppleProfileInterface } from '../interfaces/auth-apple-profile.interface';

export const mapProfile = (
  profile: AuthAppleProfileInterface,
): AuthAppleCredentialsInterface => {
  const result: AuthAppleCredentialsInterface = {
    id: profile?.sub ?? '',
    email: profile.email ?? '',
  };

  return result;
};
