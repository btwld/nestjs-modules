import {
  ConfigurableModuleBuilder,
  DynamicModule,
  Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import {
  VerifyTokenService,
  VerifyTokenServiceInterface,
} from '@concepta/nestjs-authentication';
import { createSettingsProvider } from '@concepta/nestjs-common';

import {
  AUTH_JWT_MODULE_SETTINGS_TOKEN,
  AuthJwtUserModelService,
  AuthJwtVerifyTokenService,
} from './auth-jwt.constants';
import { AuthJwtGuard } from './auth-jwt.guard';
import { AuthJwtStrategy } from './auth-jwt.strategy';
import { authJwtDefaultConfig } from './config/auth-jwt-default.config';
import { AuthJwtOptionsExtrasInterface } from './interfaces/auth-jwt-options-extras.interface';
import { AuthJwtOptionsInterface } from './interfaces/auth-jwt-options.interface';
import { AuthJwtSettingsInterface } from './interfaces/auth-jwt-settings.interface';

const RAW_OPTIONS_TOKEN = Symbol('__AUTH_JWT_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: AuthJwtModuleClass,
  OPTIONS_TYPE: AUTH_JWT_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: AUTH_JWT_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AuthJwtOptionsInterface>({
  moduleName: 'AuthJwt',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<AuthJwtOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type AuthJwtOptions = Omit<typeof AUTH_JWT_OPTIONS_TYPE, 'global'>;
export type AuthJwtAsyncOptions = Omit<
  typeof AUTH_JWT_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: AuthJwtOptionsExtrasInterface,
): DynamicModule {
  const { providers } = definition;
  const { global } = extras;

  return {
    ...definition,
    global,
    imports: createAuthJwtImports(),
    providers: createAuthJwtProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createAuthJwtExports()],
  };
}

export function createAuthJwtImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(authJwtDefaultConfig)];
}

export function createAuthJwtExports() {
  return [
    AUTH_JWT_MODULE_SETTINGS_TOKEN,
    AuthJwtUserModelService,
    AuthJwtVerifyTokenService,
    AuthJwtStrategy,
    AuthJwtGuard,
  ];
}

export function createAuthJwtProviders(options: {
  overrides?: AuthJwtOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    AuthJwtStrategy,
    AuthJwtGuard,
    VerifyTokenService,
    createAuthJwtOptionsProvider(options.overrides),
    createAuthJwtVerifyTokenServiceProvider(options.overrides),
    createAuthJwtUserModelServiceProvider(options.overrides),
    createAuthJwtAppGuardProvider(options.overrides),
  ];
}

export function createAuthJwtOptionsProvider(
  optionsOverrides?: AuthJwtOptions,
): Provider {
  return createSettingsProvider<
    AuthJwtSettingsInterface,
    AuthJwtOptionsInterface
  >({
    settingsToken: AUTH_JWT_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: authJwtDefaultConfig.KEY,
    optionsOverrides,
  });
}

export function createAuthJwtVerifyTokenServiceProvider(
  optionsOverrides?: Pick<AuthJwtOptions, 'verifyTokenService'>,
): Provider {
  return {
    provide: AuthJwtVerifyTokenService,
    inject: [RAW_OPTIONS_TOKEN, VerifyTokenService],
    useFactory: async (
      options: Pick<AuthJwtOptions, 'verifyTokenService'>,
      defaultService: VerifyTokenServiceInterface,
    ) =>
      optionsOverrides?.verifyTokenService ??
      options.verifyTokenService ??
      defaultService,
  };
}

export function createAuthJwtUserModelServiceProvider(
  optionsOverrides?: Pick<AuthJwtOptions, 'userModelService'>,
): Provider {
  return {
    provide: AuthJwtUserModelService,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (options: Pick<AuthJwtOptions, 'userModelService'>) =>
      optionsOverrides?.userModelService ?? options.userModelService,
  };
}

export function createAuthJwtAppGuardProvider(
  optionsOverrides?: Pick<AuthJwtOptions, 'appGuard'>,
): Provider {
  return {
    provide: APP_GUARD,
    inject: [RAW_OPTIONS_TOKEN, AuthJwtGuard],
    useFactory: async (
      options: Pick<AuthJwtOptions, 'appGuard'>,
      defaultGuard: AuthJwtGuard,
    ) => {
      // get app guard from the options
      const appGuard = optionsOverrides?.appGuard ?? options?.appGuard;

      // is app guard explicitly false?
      if (appGuard === false) {
        // yes, don't set a guard
        return null;
      } else {
        // return app guard if set, or fall back to default
        return appGuard ?? defaultGuard;
      }
    },
  };
}
