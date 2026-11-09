import { type OrgCreatableInterface } from './org-creatable.interface';
import { type OrgInterface } from './org.interface';

export interface OrgReplaceableInterface
  extends Pick<OrgInterface, 'id'>, OrgCreatableInterface {}
