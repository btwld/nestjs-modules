import {
  ConfigurableModuleBuilder,
  DynamicModule,
  Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSettingsProvider } from '@concepta/nestjs-common';

import {
  AUTH_RECOVERY_MODULE_SETTINGS_TOKEN,
  AuthRecoveryOtpService,
  AuthRecoveryEmailService,
  AuthRecoveryUserModelService,
  AuthRecoveryUserPasswordService,
} from './auth-recovery.constants';
import { authRecoveryDefaultConfig } from './config/auth-recovery-default.config';
import { AuthRecoveryEmailServiceInterface } from './interfaces/auth-recovery-email.service.interface';
import { AuthRecoveryOptionsExtrasInterface } from './interfaces/auth-recovery-options-extras.interface';
import { AuthRecoveryOptionsInterface } from './interfaces/auth-recovery-options.interface';
import { AuthRecoverySettingsInterface } from './interfaces/auth-recovery-settings.interface';
import { AuthRecoveryNotificationService } from './services/auth-recovery-notification.service';
import { AuthRecoveryService } from './services/auth-recovery.service';

const RAW_OPTIONS_TOKEN = Symbol('__AUTH_RECOVERY_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: AuthRecoveryModuleClass,
  OPTIONS_TYPE: AUTH_RECOVERY_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: AUTH_RECOVERY_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AuthRecoveryOptionsInterface>({
  moduleName: 'AuthRecovery',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<AuthRecoveryOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type AuthRecoveryOptions = Omit<
  typeof AUTH_RECOVERY_OPTIONS_TYPE,
  'global'
>;
export type AuthRecoveryAsyncOptions = Omit<
  typeof AUTH_RECOVERY_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: AuthRecoveryOptionsExtrasInterface,
): DynamicModule {
  const { providers } = definition;
  const { global } = extras;

  return {
    ...definition,
    global,
    imports: createAuthRecoveryImports(),
    providers: createAuthRecoveryProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createAuthRecoveryExports()],
  };
}

export function createAuthRecoveryImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(authRecoveryDefaultConfig)];
}

export function createAuthRecoveryExports() {
  return [
    AUTH_RECOVERY_MODULE_SETTINGS_TOKEN,
    AuthRecoveryOtpService,
    AuthRecoveryEmailService,
    AuthRecoveryUserModelService,
    AuthRecoveryUserPasswordService,
    AuthRecoveryService,
  ];
}

export function createAuthRecoveryProviders(options: {
  overrides?: AuthRecoveryOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    AuthRecoveryService,
    createAuthRecoverySettingsProvider(options.overrides),
    createAuthRecoveryOtpServiceProvider(options.overrides),
    createAuthRecoveryEmailServiceProvider(options.overrides),
    createAuthRecoveryUserModelServiceProvider(options.overrides),
    createAuthRecoveryUserPasswordServiceProvider(options.overrides),
    createAuthRecoveryNotificationServiceProvider(options.overrides),
  ];
}

export function createAuthRecoverySettingsProvider(
  optionsOverrides?: AuthRecoveryOptions,
): Provider {
  return createSettingsProvider<
    AuthRecoverySettingsInterface,
    AuthRecoveryOptionsInterface
  >({
    settingsToken: AUTH_RECOVERY_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: authRecoveryDefaultConfig.KEY,
    optionsOverrides,
  });
}

export function createAuthRecoveryOtpServiceProvider(
  optionsOverrides?: Pick<AuthRecoveryOptions, 'otpService'>,
): Provider {
  return {
    provide: AuthRecoveryOtpService,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (options: Pick<AuthRecoveryOptions, 'otpService'>) =>
      optionsOverrides?.otpService ?? options.otpService,
  };
}

export function createAuthRecoveryEmailServiceProvider(
  optionsOverrides?: Pick<AuthRecoveryOptions, 'emailService'>,
): Provider {
  return {
    provide: AuthRecoveryEmailService,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (options: Pick<AuthRecoveryOptions, 'emailService'>) =>
      optionsOverrides?.emailService ?? options.emailService,
  };
}

export function createAuthRecoveryUserModelServiceProvider(
  optionsOverrides?: Pick<AuthRecoveryOptions, 'userModelService'>,
): Provider {
  return {
    provide: AuthRecoveryUserModelService,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (
      options: Pick<AuthRecoveryOptions, 'userModelService'>,
    ) => optionsOverrides?.userModelService ?? options.userModelService,
  };
}

export function createAuthRecoveryUserPasswordServiceProvider(
  optionsOverrides?: Pick<AuthRecoveryOptions, 'userPasswordService'>,
): Provider {
  return {
    provide: AuthRecoveryUserPasswordService,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (
      options: Pick<AuthRecoveryOptions, 'userPasswordService'>,
    ) => optionsOverrides?.userPasswordService ?? options.userPasswordService,
  };
}

export function createAuthRecoveryNotificationServiceProvider(
  optionsOverrides?: Pick<AuthRecoveryOptions, 'notificationService'>,
): Provider {
  return {
    provide: AuthRecoveryNotificationService,
    inject: [
      RAW_OPTIONS_TOKEN,
      AUTH_RECOVERY_MODULE_SETTINGS_TOKEN,
      AuthRecoveryEmailService,
    ],
    useFactory: async (
      options: Pick<AuthRecoveryOptions, 'notificationService'>,
      settings: AuthRecoverySettingsInterface,
      emailService: AuthRecoveryEmailServiceInterface,
    ) =>
      optionsOverrides?.notificationService ??
      options.notificationService ??
      new AuthRecoveryNotificationService(settings, emailService),
  };
}
