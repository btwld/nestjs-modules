import { type AuthenticateOptions } from 'passport-apple';

import { type Type } from '@nestjs/common';

import { type AuthenticationCodeInterface } from '@concepta/nestjs-common';

import { type MapProfile } from '../auth-apple.types';

export interface AuthAppleSettingsInterface extends AuthenticateOptions {
  loginDto?: Type<AuthenticationCodeInterface>;
  mapProfile: MapProfile;
}
