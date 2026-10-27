import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  IssueTokenService,
  type IssueTokenServiceInterface,
} from '@concepta/nestjs-authentication';
import { createSettingsProvider } from '@concepta/nestjs-common';
import { FederatedOAuthService } from '@concepta/nestjs-federated';
import { JwtService } from '@concepta/nestjs-jwt';

import {
  AUTH_APPLE_ISSUE_TOKEN_SERVICE_TOKEN,
  AUTH_APPLE_JWT_SERVICE_TOKEN,
  AUTH_APPLE_MODULE_SETTINGS_TOKEN,
  AUTH_APPLE_SERVICE_TOKEN,
} from './auth-apple.constants';
import { AuthAppleService } from './auth-apple.service';
import { AuthAppleStrategy } from './auth-apple.strategy';
import { authAppleDefaultConfig } from './config/auth-apple-default.config';
import { type AuthAppleOptionsExtrasInterface } from './interfaces/auth-apple-options-extras.interface';
import { type AuthAppleOptionsInterface } from './interfaces/auth-apple-options.interface';
import { type AuthAppleServiceInterface } from './interfaces/auth-apple-service.interface';
import { type AuthAppleSettingsInterface } from './interfaces/auth-apple-settings.interface';

const RAW_OPTIONS_TOKEN = Symbol('__AUTH_APPLE_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: AuthAppleModuleClass,
  OPTIONS_TYPE: AUTH_APPLE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: AUTH_APPLE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AuthAppleOptionsInterface>({
  moduleName: 'AuthApple',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<AuthAppleOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type AuthAppleOptions = Omit<typeof AUTH_APPLE_OPTIONS_TYPE, 'global'>;
export type AuthAppleAsyncOptions = Omit<
  typeof AUTH_APPLE_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: AuthAppleOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createAuthAppleImports(),
    providers: createAuthAppleProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createAuthAppleExports()],
  };
}

export function createAuthAppleImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(authAppleDefaultConfig)];
}

export function createAuthAppleExports() {
  return [
    AUTH_APPLE_MODULE_SETTINGS_TOKEN,
    AUTH_APPLE_ISSUE_TOKEN_SERVICE_TOKEN,
  ];
}

export function createAuthAppleProviders(options: {
  overrides?: AuthAppleOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    AuthAppleStrategy,
    IssueTokenService,
    FederatedOAuthService,
    AuthAppleService,
    createAuthAppleOptionsProvider(options.overrides),
    createAuthAppleJwtServiceProvider(options.overrides),
    createAuthAppleIssueTokenServiceProvider(options.overrides),
    createAuthAppleServiceProvider(options.overrides),
  ];
}

export function createAuthAppleOptionsProvider(
  optionsOverrides?: AuthAppleOptions,
): Provider {
  return createSettingsProvider<
    AuthAppleSettingsInterface,
    AuthAppleOptionsInterface
  >({
    settingsToken: AUTH_APPLE_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: authAppleDefaultConfig.KEY,
    optionsOverrides,
  });
}

export function createAuthAppleIssueTokenServiceProvider(
  optionsOverrides?: AuthAppleOptions,
): Provider {
  return {
    provide: AUTH_APPLE_ISSUE_TOKEN_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN, IssueTokenService],
    useFactory: async (
      options: AuthAppleOptionsInterface,
      defaultService: IssueTokenServiceInterface,
    ) =>
      optionsOverrides?.issueTokenService ??
      options.issueTokenService ??
      defaultService,
  };
}

export function createAuthAppleServiceProvider(
  optionsOverrides?: AuthAppleOptions,
): Provider {
  return {
    provide: AUTH_APPLE_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN, AuthAppleService],
    useFactory: async (
      options: AuthAppleOptionsInterface,
      defaultService: AuthAppleServiceInterface,
    ) =>
      optionsOverrides?.authAppleService ??
      options.authAppleService ??
      defaultService,
  };
}

export function createAuthAppleJwtServiceProvider(
  optionsOverrides?: AuthAppleOptions,
): Provider {
  return {
    provide: AUTH_APPLE_JWT_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (options: AuthAppleOptionsInterface) =>
      optionsOverrides?.jwtService ?? options.jwtService ?? new JwtService(),
  };
}
