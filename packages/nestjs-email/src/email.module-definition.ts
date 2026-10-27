import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  Logger,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSettingsProvider } from '@concepta/nestjs-common';

import { emailSettingsConfig } from './config/email-settings.config';
import {
  EMAIL_MODULE_SETTINGS_TOKEN,
  EMAIL_MODULE_MAILER_SERVICE_TOKEN,
} from './email.constants';
import { EmailService } from './email.service';
import { type EmailOptionsExtrasInterface } from './interfaces/email-options-extras.interface';
import { type EmailOptionsInterface } from './interfaces/email-options.interface';
import { type EmailSettingsInterface } from './interfaces/email-settings.interface';

const RAW_OPTIONS_TOKEN = Symbol('__EMAIL_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: EmailModuleClass,
  OPTIONS_TYPE: EMAIL_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: EMAIL_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<EmailOptionsInterface>({
  moduleName: 'Email',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<EmailOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type EmailOptions = Omit<typeof EMAIL_OPTIONS_TYPE, 'global'>;
export type EmailAsyncOptions = Omit<typeof EMAIL_ASYNC_OPTIONS_TYPE, 'global'>;

function definitionTransform(
  definition: DynamicModule,
  extras: EmailOptionsExtrasInterface,
): DynamicModule {
  const { providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createEmailImports(),
    providers: createEmailProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...(createEmailExports() ?? [])],
  };
}

export function createEmailImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(emailSettingsConfig)];
}

export function createEmailExports(): DynamicModule['exports'] {
  return [
    EMAIL_MODULE_SETTINGS_TOKEN,
    EMAIL_MODULE_MAILER_SERVICE_TOKEN,
    EmailService,
  ];
}

export function createEmailProviders(options: {
  overrides?: EmailOptions;
  providers?: Provider[];
  global?: boolean;
}): Provider[] {
  return [
    ...(options.providers ?? []),
    Logger,
    EmailService,
    createEmailSettingsProvider(options.overrides),
    createEmailMailerServiceProvider(options.overrides),
  ];
}

export function createEmailSettingsProvider(
  optionsOverrides?: EmailOptions,
): Provider {
  return createSettingsProvider<EmailSettingsInterface, EmailOptionsInterface>({
    settingsToken: EMAIL_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: emailSettingsConfig.KEY,
    optionsOverrides,
  });
}

export function createEmailMailerServiceProvider(
  optionsOverrides?: EmailOptions,
): Provider {
  return {
    provide: EMAIL_MODULE_MAILER_SERVICE_TOKEN,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: async (options: EmailOptionsInterface) => {
      return optionsOverrides?.mailerService ?? options.mailerService;
    },
  };
}
