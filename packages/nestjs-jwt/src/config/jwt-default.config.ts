import { randomUUID } from 'crypto';

import { InternalServerErrorException, Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

import { toMilliseconds } from '@concepta/nestjs-common';

import { JwtConfigUndefinedException } from '../exceptions/jwt-config-undefined.exception';
import { JwtFallbackConfigUndefinedException } from '../exceptions/jwt-fallback-config-undefined.exception';
import { JwtSettingsInterface } from '../interfaces/jwt-settings.interface';
import { JWT_MODULE_DEFAULT_SETTINGS_TOKEN } from '../jwt.constants';

/**
 * Settings defaults.
 *
 * TODO: need to also get defaults from ENV
 */
export const jwtDefaultConfig = registerAs(
  JWT_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): JwtSettingsInterface => {
    // the default options
    const options: JwtSettingsInterface = {
      default: {
        signOptions: {
          expiresIn: toMilliseconds(
            process.env?.JWT_MODULE_DEFAULT_EXPIRES_IN,
            '1h',
          ),
        },
      },
      access: {
        signOptions: {
          expiresIn: toMilliseconds(
            process.env?.JWT_MODULE_ACCESS_EXPIRES_IN ??
              process.env?.JWT_MODULE_DEFAULT_EXPIRES_IN,
            '1h',
          ),
        },
      },
      refresh: {
        signOptions: {
          expiresIn: toMilliseconds(
            process.env?.JWT_MODULE_REFRESH_EXPIRES_IN,
            '99y',
          ),
        },
      },
    };

    configureAccessSecret(options.access);
    configureRefreshSecret(options.refresh, options.access);

    return options;
  },
);

/**
 * @internal
 */
function configureAccessSecret(options: JwtSettingsInterface['access']) {
  if (!options) {
    throw new JwtConfigUndefinedException();
  }
  // was an access secret provided?
  if (process.env?.JWT_MODULE_ACCESS_SECRET) {
    // yes, use it
    options.secret = process.env.JWT_MODULE_ACCESS_SECRET;
  } else if (process.env?.NODE_ENV === 'production') {
    // we are in production, this is now allowed
    throw new InternalServerErrorException(
      'A secret key must be set when NODE_ENV=production',
    );
  } else {
    // wae are not in production, log a warning
    Logger.warn(
      'No default access token secret was provided to the JWT module.' +
        ' Since NODE_ENV is not production, a random string will be generated.' +
        ' It will not persist past this instance of the module.',
    );
    // generate one for this module instance only
    options.secret = randomUUID();
  }
}

/**
 * @internal
 */
function configureRefreshSecret(
  options: JwtSettingsInterface['refresh'],
  fallbackOptions: JwtSettingsInterface['access'],
) {
  if (!options) {
    throw new JwtConfigUndefinedException();
  }
  if (!fallbackOptions) {
    throw new JwtFallbackConfigUndefinedException();
  }
  // was a refresh secret provided?
  if (process.env?.JWT_MODULE_REFRESH_SECRET) {
    // yes, use it
    options.secret = process.env.JWT_MODULE_REFRESH_SECRET;
  } else {
    // log a warning
    Logger.log(
      'No default refresh token secret was provided to the JWT module.' +
        ' Copying the secret from the access token configuration.',
    );
    // use the same one as the access
    options.secret = fallbackOptions['secret'];
  }
}
