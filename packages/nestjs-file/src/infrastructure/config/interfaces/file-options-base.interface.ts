import { type FileSettingsInterface } from './file-settings.interface.js';

/**
 * The options every file module takes, scanner or not.
 */
export interface FileOptionsBaseInterface {
  settings?: FileSettingsInterface;
}
