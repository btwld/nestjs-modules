import { AuthGithubProfileInterface } from '../interfaces/auth-github-profile.interface';
import { AuthGithubCredentialsInterface } from '../interfaces/auth-github-credentials.interface';

export const mapProfile = (
  profile: AuthGithubProfileInterface,
): AuthGithubCredentialsInterface => {
  let email = '';

  if (profile.email) {
    email = profile.email;
  } else if (profile.emails && profile.emails.length > 0) {
    email = profile.emails[0].value;
  }

  const result: AuthGithubCredentialsInterface = {
    id: profile?.id ?? '',
    email,
  };
  return result;
};
