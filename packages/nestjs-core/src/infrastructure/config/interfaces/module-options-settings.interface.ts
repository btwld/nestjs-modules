export interface ModuleOptionsSettingsInterface<T> {
  settings?: T;
  settingsTransform?: (settings?: T, defaultSettings?: T) => T;
}
