import { type StrategyOptions } from 'passport-google-oauth20';

import { type Type } from '@nestjs/common';

import { type AuthenticationCodeInterface } from '@concepta/nestjs-common';

import { type MapProfile } from '../auth-google.types';

export interface AuthGoogleSettingsInterface extends StrategyOptions {
  loginDto?: Type<AuthenticationCodeInterface>;
  mapProfile: MapProfile;
}
