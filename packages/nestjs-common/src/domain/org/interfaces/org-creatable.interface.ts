import { type OrgInterface } from './org.interface';

export interface OrgCreatableInterface
  extends
    Pick<OrgInterface, 'name' | 'ownerId'>,
    Partial<Pick<OrgInterface, 'active'>> {}
