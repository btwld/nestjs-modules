import { type Type } from '@nestjs/common';

import { type AuthenticationCodeInterface } from '@concepta/nestjs-common';

import { type MapProfile } from '../auth-github.types';

export interface AuthGithubSettingsInterface {
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  loginDto?: Type<AuthenticationCodeInterface>;
  mapProfile: MapProfile;
}
