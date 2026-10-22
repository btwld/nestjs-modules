import { type FactoryProvider } from '@nestjs/common';

import { createSettingsProvider } from './create-settings-provider';

describe(createSettingsProvider.name, () => {
  // Mock tokens and keys
  const settingsKey = 'exampleSettingsKey';
  const settingsToken = 'exampleSettingsToken';
  const optionsToken = 'exampleOptionsToken';

  // Mock options and settings
  const defaultSettings = { key: 'default' };
  const newSettings = { key: 'new' };

  // Example options object
  const options = {
    settingsKey,
    settingsToken,
    optionsToken,
    optionsOverrides: {
      settings: newSettings,
      settingsTransform: jest.fn((effective, defaults) => ({
        ...defaults,
        ...effective,
      })),
    },
  };

  it('returns a correct provider object', () => {
    const provider = createSettingsProvider(options) as FactoryProvider;
    expect(provider.provide).toBe(settingsToken);
    expect(provider.inject).toEqual([optionsToken, settingsKey]);
    expect(typeof provider.useFactory).toBe('function');
  });

  it('useFactory returns effective settings when overrides are provided', async () => {
    const provider = createSettingsProvider(options) as FactoryProvider;
    const settings = await provider.useFactory(
      { settings: defaultSettings },
      defaultSettings,
    );
    expect(settings).toEqual(newSettings);
  });

  it('useFactory uses default settings when no overrides are provided', async () => {
    const provider = createSettingsProvider({
      ...options,
      optionsOverrides: undefined,
    }) as FactoryProvider;
    const settings = await provider.useFactory(
      { settings: defaultSettings },
      defaultSettings,
    );
    expect(settings).toEqual(defaultSettings);
  });

  it('calls settingsTransform function when provided', async () => {
    const provider = createSettingsProvider(options) as FactoryProvider;
    await provider.useFactory({ settings: defaultSettings }, defaultSettings);
    expect(options.optionsOverrides.settingsTransform).toHaveBeenCalledWith(
      newSettings,
      defaultSettings,
    );
  });

  it('calls settingsTransform function when provided', async () => {
    const provider = createSettingsProvider({
      ...options,
      optionsOverrides: undefined,
    }) as FactoryProvider;
    const settings = await provider.useFactory(
      { settings: undefined },
      defaultSettings,
    );
    expect(settings).toEqual(defaultSettings);
  });
});
