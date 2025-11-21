import { InjectionToken, Provider } from '@nestjs/common';

import { ModuleOptionsSettingsInterface } from '../interfaces/module-options-settings.interface';
export function createSettingsProvider<
  ModuleSettingsType,
  ModuleOptionsType extends ModuleOptionsSettingsInterface<ModuleSettingsType>,
>(options: {
  settingsKey: string | symbol;
  settingsToken: string;
  optionsToken: InjectionToken;
  optionsOverrides?: ModuleOptionsType;
}): Provider {
  // break out the options
  const { optionsOverrides, settingsToken, optionsToken, settingsKey } =
    options;

  // return the settings provider
  return {
    provide: settingsToken,
    inject: [optionsToken, settingsKey],
    useFactory: async (
      moduleOptions: ModuleOptionsType,
      defaultSettings: ModuleSettingsType,
    ) => {
      // get effective settings, overrides completely replace module settings
      const effectiveSettings =
        optionsOverrides?.settings ?? moduleOptions?.settings;

      // was a transformer provided?
      if (optionsOverrides?.settingsTransform) {
        // yes, call it
        return optionsOverrides.settingsTransform(
          effectiveSettings,
          defaultSettings,
        );
      } else {
        // no, return defaults if there are NO effective settings
        return effectiveSettings ?? defaultSettings;
      }
    },
  };
}
