import { registerAs } from '@nestjs/config';

import { AUTH_APPLE_MODULE_DEFAULT_SETTINGS_TOKEN } from '../auth-apple.constants';
import { AuthAppleLoginDto } from '../dto/auth-apple-login.dto';
import { type AuthAppleSettingsInterface } from '../interfaces/auth-apple-settings.interface';
import { mapProfile } from '../utils/auth-apple-map-profile';
import { authAppleScopeParser } from '../utils/auth-apple-scope-parser.util';

/**
 * Default configuration for auth apple.
 */
export const authAppleDefaultConfig = registerAs(
  AUTH_APPLE_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): AuthAppleSettingsInterface => ({
    /**
     * The login dto
     */
    loginDto: AuthAppleLoginDto,
    clientID: process.env.APPLE_CLIENT_ID ?? 'client_id',
    callbackURL: process.env.APPLE_CALLBACK_URL ?? 'callback_url',
    teamID: process.env.APPLE_TEAM_ID ?? 'teamID',
    keyID: process.env.APPLE_KEY_ID ?? 'keyID',
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION ?? '',
    privateKeyString: process.env.APPLE_PRIVATE_KEY_STRING ?? '',
    passReqToCallback: false,
    scope:
      'APPLE_SCOPE' in process.env && process.env.APPLE_SCOPE
        ? authAppleScopeParser(process.env.APPLE_SCOPE)
        : ['email'],
    mapProfile: mapProfile,
  }),
);
