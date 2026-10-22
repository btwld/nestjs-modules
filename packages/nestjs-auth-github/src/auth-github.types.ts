import { type AuthGithubCredentialsInterface } from './interfaces/auth-github-credentials.interface';
import { type AuthGithubProfileInterface } from './interfaces/auth-github-profile.interface';

export type MapProfile = (
  profile: AuthGithubProfileInterface,
) => AuthGithubCredentialsInterface;
