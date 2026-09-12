import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { createSettingsProvider } from '@concepta/nestjs-core';

import { CreatePasswordHandler } from './application/commands/handlers/create-password.handler.js';
import { ValidateCurrentPasswordHandler } from './application/commands/handlers/validate-current-password.handler.js';
import { ValidatePasswordHistoryHandler } from './application/commands/handlers/validate-password-history.handler.js';
import { ValidatePasswordHandler } from './application/commands/handlers/validate-password.handler.js';
import { PasswordPolicy } from './domain/policies/password.policy.js';
import { PasswordCreationService } from './domain/services/password-creation.service.js';
import { PasswordStorageService } from './domain/services/password-storage.service.js';
import { PasswordStrengthService } from './domain/services/password-strength.service.js';
import { PasswordValidationService } from './domain/services/password-validation.service.js';
import { type PasswordOptionsExtrasInterface } from './infrastructure/config/interfaces/password-options-extras.interface.js';
import { type PasswordOptionsInterface } from './infrastructure/config/interfaces/password-options.interface.js';
import { type PasswordSettingsInterface } from './infrastructure/config/interfaces/password-settings.interface.js';
import { passwordDefaultConfig } from './infrastructure/config/password-default.config.js';
import { createPasswordPolicyProvider } from './infrastructure/utils/create-password-policy-provider.js';
import { PASSWORD_MODULE_SETTINGS_TOKEN } from './password.constants.js';

const RAW_OPTIONS_TOKEN = Symbol('__PASSWORD_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: PasswordModuleClass,
  OPTIONS_TYPE: PASSWORD_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: PASSWORD_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<PasswordOptionsInterface>({
  moduleName: 'Password',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<PasswordOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type PasswordOptions = Omit<typeof PASSWORD_OPTIONS_TYPE, 'global'>;
export type PasswordAsyncOptions = Omit<
  typeof PASSWORD_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: PasswordOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createPasswordImports(),
    providers: createPasswordProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createPasswordExports()],
  };
}

export function createPasswordImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(passwordDefaultConfig), CqrsModule.forRoot()];
}

export function createPasswordProviders(overrides: {
  options?: PasswordOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(overrides.providers ?? []),
    createPasswordSettingsProvider(overrides.options),
    createPasswordPolicyProvider(),
    PasswordCreationService,
    PasswordStrengthService,
    PasswordStorageService,
    PasswordValidationService,
    // command handlers
    CreatePasswordHandler,
    ValidatePasswordHandler,
    ValidateCurrentPasswordHandler,
    ValidatePasswordHistoryHandler,
  ];
}

export function createPasswordExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [
    PasswordPolicy,
    PasswordCreationService,
    PasswordStrengthService,
    PasswordStorageService,
    PasswordValidationService,
  ];
}

export function createPasswordSettingsProvider(
  optionsOverrides?: PasswordOptions,
): Provider {
  return createSettingsProvider<
    PasswordSettingsInterface,
    PasswordOptionsInterface
  >({
    settingsToken: PASSWORD_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: passwordDefaultConfig.KEY,
    optionsOverrides,
  });
}
