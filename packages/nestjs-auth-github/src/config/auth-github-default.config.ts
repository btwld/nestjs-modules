import { registerAs } from '@nestjs/config';

import { AUTH_GITHUB_MODULE_DEFAULT_SETTINGS_TOKEN } from '../auth-github.constants';
import { AuthGithubLoginDto } from '../dto/auth-github-login.dto';
import { type AuthGithubSettingsInterface } from '../interfaces/auth-github-settings.interface';
import { mapProfile } from '../utils/auth-github-map-profile';

/**
 * Default configuration for auth github.
 */
export const authGithubDefaultConfig = registerAs(
  AUTH_GITHUB_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): AuthGithubSettingsInterface => ({
    /**
     * The login dto
     */
    loginDto: AuthGithubLoginDto,
    clientId: process.env.GITHUB_CLIENT_ID ?? 'client_id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? 'secret',
    callbackURL: process.env.GITHUB_CALLBACK_URL ?? 'callback_url',
    mapProfile: mapProfile,
  }),
);
