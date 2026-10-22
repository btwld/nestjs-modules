import { registerAs } from '@nestjs/config';

import { AUTH_GOOGLE_MODULE_DEFAULT_SETTINGS_TOKEN } from '../auth-google.constants';
import { AuthGoogleLoginDto } from '../dto/auth-google-login.dto';
import { type AuthGoogleSettingsInterface } from '../interfaces/auth-google-settings.interface';
import { mapProfile } from '../utils/auth-google-map-profile';
import { authGoogleParseScope } from '../utils/auth-google-scope-parser.util';

/**
 * Default configuration for auth google.
 */
export const authGoogleDefaultConfig = registerAs(
  AUTH_GOOGLE_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): AuthGoogleSettingsInterface => ({
    /**
     * The login dto
     */
    loginDto: AuthGoogleLoginDto,
    clientID: process.env.GOOGLE_CLIENT_ID ?? 'client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'callback_url',
    scope:
      'GOOGLE_SCOPE' in process.env && process.env.GOOGLE_SCOPE
        ? authGoogleParseScope(process.env.GOOGLE_SCOPE)
        : ['email', 'profile'],
    mapProfile: mapProfile,
  }),
);
