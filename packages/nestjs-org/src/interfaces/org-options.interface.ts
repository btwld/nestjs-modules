import { type OrgModelServiceInterface } from './org-model-service.interface';
import { type OrgSettingsInterface } from './org-settings.interface';

export interface OrgOptionsInterface {
  settings?: OrgSettingsInterface;
  orgModelService?: OrgModelServiceInterface;
}
