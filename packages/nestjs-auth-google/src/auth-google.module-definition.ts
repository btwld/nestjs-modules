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

import {
  AUTH_GOOGLE_ISSUE_TOKEN_SERVICE_TOKEN,
  AUTH_GOOGLE_MODULE_SETTINGS_TOKEN,
} from './auth-google.constants';
import { AuthGoogleStrategy } from './auth-google.strategy';
import { authGoogleDefaultConfig } from './config/auth-google-default.config';
import { type AuthGoogleOptionsExtrasInterface } from './interfaces/auth-google-options-extras.interface';
import { type AuthGoogleOptionsInterface } from './interfaces/auth-google-options.interface';
import { type AuthGoogleSettingsInterface } from './interfaces/auth-google-settings.interface';

const RAW_OPTIONS_TOKEN = Symbol('__AUTH_GOOGLE_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: AuthGoogleModuleClass,
  OPTIONS_TYPE: AUTH_GOOGLE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: AUTH_GOOGLE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AuthGoogleOptionsInterface>({
  moduleName: 'AuthGoogle',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<AuthGoogleOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type AuthGoogleOptions = Omit<typeof AUTH_GOOGLE_OPTIONS_TYPE, 'global'>;
export type AuthGoogleAsyncOptions = Omit<
  typeof AUTH_GOOGLE_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: AuthGoogleOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createAuthGoogleImports(),
    providers: createAuthGoogleProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createAuthGoogleExports()],
  };
}

export function createAuthGoogleImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(authGoogleDefaultConfig)];
}

export function createAuthGoogleExports() {
  return [
    AUTH_GOOGLE_MODULE_SETTINGS_TOKEN,
    AUTH_GOOGLE_ISSUE_TOKEN_SERVICE_TOKEN,
  ];
}

export function createAuthGoogleProviders(options: {
  overrides?: AuthGoogleOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    AuthGoogleStrategy,
    IssueTokenService,
    FederatedOAuthService,
    createAuthGoogleOptionsProvider(options.overrides),
    createAuthGoogleIssueTokenServiceProvider(options.overrides),
  ];
}

export function createAuthGoogleOptionsProvider(
  optionsOverrides?: AuthGoogleOptions,
): Provider {
  return createSettingsProvider<
    AuthGoogleSettingsInterface,
    AuthGoogleOptionsInterface
  >({
    settingsToken: AUTH_GOOGLE_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: authGoogleDefaultConfig.KEY,
    optionsOverrides,
  });
}

export function createAuthGoogleIssueTokenServiceProvider(
  optionsOverrides?: AuthGoogleOptions,
): Provider {
  return {
    provide: AUTH_GOOGLE_ISSUE_TOKEN_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN, IssueTokenService],
    useFactory: async (
      options: AuthGoogleOptionsInterface,
      defaultService: IssueTokenServiceInterface,
    ) =>
      optionsOverrides?.issueTokenService ??
      options.issueTokenService ??
      defaultService,
  };
}
