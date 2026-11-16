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
  AUTH_GITHUB_ISSUE_TOKEN_SERVICE_TOKEN,
  AUTH_GITHUB_MODULE_SETTINGS_TOKEN,
} from './auth-github.constants';
import { AuthGithubStrategy } from './auth-github.strategy';
import { authGithubDefaultConfig } from './config/auth-github-default.config';
import { type AuthGithubOptionsExtrasInterface } from './interfaces/auth-github-options-extras.interface';
import { type AuthGithubOptionsInterface } from './interfaces/auth-github-options.interface';
import { type AuthGithubSettingsInterface } from './interfaces/auth-github-settings.interface';

const RAW_OPTIONS_TOKEN = Symbol('__AUTH_GITHUB_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: AuthGithubModuleClass,
  OPTIONS_TYPE: AUTH_GITHUB_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: AUTH_GITHUB_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AuthGithubOptionsInterface>({
  moduleName: 'AuthGithub',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<AuthGithubOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type AuthGithubOptions = Omit<typeof AUTH_GITHUB_OPTIONS_TYPE, 'global'>;
export type AuthGithubAsyncOptions = Omit<
  typeof AUTH_GITHUB_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: AuthGithubOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createAuthGithubImports(),
    providers: createAuthGithubProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createAuthGithubExports()],
  };
}

export function createAuthGithubImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(authGithubDefaultConfig)];
}

export function createAuthGithubExports() {
  return [
    AUTH_GITHUB_MODULE_SETTINGS_TOKEN,
    AUTH_GITHUB_ISSUE_TOKEN_SERVICE_TOKEN,
  ];
}

export function createAuthGithubProviders(options: {
  overrides?: AuthGithubOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    AuthGithubStrategy,
    IssueTokenService,
    FederatedOAuthService,
    createAuthGithubOptionsProvider(options.overrides),
    createAuthGithubIssueTokenServiceProvider(options.overrides),
  ];
}

export function createAuthGithubOptionsProvider(
  optionsOverrides?: AuthGithubOptions,
): Provider {
  return createSettingsProvider<
    AuthGithubSettingsInterface,
    AuthGithubOptionsInterface
  >({
    settingsToken: AUTH_GITHUB_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: authGithubDefaultConfig.KEY,
    optionsOverrides,
  });
}

export function createAuthGithubIssueTokenServiceProvider(
  optionsOverrides?: AuthGithubOptions,
): Provider {
  return {
    provide: AUTH_GITHUB_ISSUE_TOKEN_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN, IssueTokenService],
    useFactory: async (
      options: AuthGithubOptionsInterface,
      defaultService: IssueTokenServiceInterface,
    ) =>
      optionsOverrides?.issueTokenService ??
      options.issueTokenService ??
      defaultService,
  };
}
