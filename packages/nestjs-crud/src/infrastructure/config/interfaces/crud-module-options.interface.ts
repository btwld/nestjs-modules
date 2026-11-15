import { type CrudRequestPolicyInterface } from '../../policies/interfaces/crud-request-policy.interface.js';

import { type CrudModuleSettingsInterface } from './crud-module-settings.interface.js';

export interface CrudModuleOptionsInterface {
  /**
   * Module settings.
   */
  settings?: CrudModuleSettingsInterface;

  /**
   * Decides whether each CRUD request may run, before it is dispatched.
   * Defaults to letting every request run.
   */
  requestPolicy?: CrudRequestPolicyInterface;
}
